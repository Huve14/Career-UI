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

  const prompt = `You are a UAE job search expert. Analyze these listings for a candidate with:
- Target roles: ${profile?.targetRoles || 'Data Analyst, IT Specialist'}
- Location: ${regionLabel}${visaSponsorship ? '\n- MUST have visa sponsorship' : ''}
- Skills: ${profile?.superpowers?.join(', ') || 'Data Analysis, BI, IT Support'}

Rate each job 0-100 on fit. Also set "visaSponsorship": true/false.

Return JSON array: [{"id": 1, "score": 85, "visaSponsorship": true}, ...]

Jobs:
${JSON.stringify(jobs.map(j => ({ id: j.id, title: j.title, company: j.company, location: j.location })))}`

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
    const scores = JSON.parse(content.replace(/```json\s*|\s*```/g, '').trim())
    const scoreMap = new Map(scores.map(s => [s.id, { score: s.score, visaSponsorship: s.visaSponsorship }]))

    for (const job of jobs) {
      if (scoreMap.has(job.id)) {
        const meta = scoreMap.get(job.id)
        job.score = meta.score
        if (meta.visaSponsorship !== undefined) job.visaSponsorship = meta.visaSponsorship
      }
    }

    return jobs.sort((a, b) => b.score - a.score)
  } catch {
    return jobs
  }
}
