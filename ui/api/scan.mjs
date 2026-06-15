// Vercel Serverless Function — /api/scan
// Scores job listings using DeepSeek AI. Client handles search via Google CSE.

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ''

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { deepseekKey: clientKey, portals, profile, region, visaSponsorship, clientJobs, scoreOnly } = req.body || {}
  const apiKey = clientKey || DEEPSEEK_KEY

  // If client sent jobs, score them with DeepSeek
  if (clientJobs && clientJobs.length > 0) {
    if (!apiKey) return res.json({ jobs: clientJobs, count: clientJobs.length, source: 'client', deepseek: false })

    try {
      const enhanced = await deepseekEnhance(clientJobs, apiKey, profile, region, visaSponsorship)
      return res.json({ jobs: enhanced, count: enhanced.length, source: 'deepseek', deepseek: true })
    } catch {
      return res.json({ jobs: clientJobs, count: clientJobs.length, source: 'client', deepseek: false })
    }
  }

  // If scoreOnly, return scores without modifying the jobs
  if (scoreOnly && scoreOnly.length > 0) {
    if (!apiKey) return res.json({ scores: scoreOnly.map(j => ({ id: j.id, score: 50, visaSponsorship: false })) })

    try {
      const enhanced = await deepseekEnhance(scoreOnly, apiKey, profile, region, visaSponsorship)
      return res.json({
        scores: enhanced.map(j => ({ id: j.id, score: j.score, visaSponsorship: j.visaSponsorship })),
      })
    } catch {
      return res.json({ scores: scoreOnly.map(j => ({ id: j.id, score: 50, visaSponsorship: false })) })
    }
  }

  return res.json({ jobs: [], count: 0, source: 'idle', deepseek: !!apiKey })
}

async function deepseekEnhance(jobs, apiKey, profile, region, visaSponsorship) {
  const REGION_MAP = {
    'all': 'United Arab Emirates',
    'dubai': 'Dubai',
    'abu-dhabi': 'Abu Dhabi',
    'sharjah': 'Sharjah',
    'remote': 'Remote',
  }
  const regionLabel = REGION_MAP[region] || 'UAE'

  const hasText = jobs.some(j => j.text)
  const jobData = hasText
    ? jobs.map(j => ({ id: j.id, text: j.text }))
    : jobs.map(j => ({ id: j.id, title: j.title, company: j.company, location: j.location }))

  const prompt = `You are a UAE job search expert. Analyze these listings for a candidate with:
- Target roles: ${getTargetRoles(profile)}
- Location: ${regionLabel}${visaSponsorship ? '\n- MUST have visa sponsorship' : ''}
- Skills: ${getSkills(profile)}

${hasText
  ? 'Each entry is a raw job URL or description. Parse it and extract: title, company, location, url if present, and whether visa sponsorship is mentioned.\n\n'
  : ''}Rate each job 0-100 on fit. Also set "visaSponsorship": true/false.

Return JSON array: [{"id": 1, "title": "Data Analyst", "company": "Company Name", "location": "Dubai", "url": "https://...", "score": 85, "visaSponsorship": true}, ...]

Jobs:
${JSON.stringify(jobData)}`

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    }),
  })

  if (!response.ok) throw new Error(`DeepSeek API error: ${response.status}`)

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) return jobs

  try {
    const enhanced = JSON.parse(content.replace(/```json\s*|\s*```/g, '').trim())

    const enhancedMap = new Map(enhanced.map(s => [s.id, { score: s.score, visaSponsorship: s.visaSponsorship, title: s.title, company: s.company, url: s.url }]))

    for (const job of jobs) {
      if (enhancedMap.has(job.id)) {
        const meta = enhancedMap.get(job.id)
        job.score = meta.score
        job.visaSponsorship = meta.visaSponsorship
        if (meta.title) job.title = meta.title
        if (meta.company) job.company = meta.company
        if (meta.url) job.url = meta.url
      }
    }

    return jobs.sort((a, b) => b.score - a.score)
  } catch {
    return jobs
  }
}

function getTargetRoles(profile) {
  if (profile?.targetRoles) return profile.targetRoles
  return 'Data Analyst, IT Specialist'
}

function getSkills(profile) {
  if (profile?.superpowers?.length) return profile.superpowers.join(', ')
  return 'Data Analysis, BI, IT Support'
}
