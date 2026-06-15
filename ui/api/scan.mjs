// Vercel Serverless Function — /api/scan
// Scans multiple job boards for UAE Data Analyst / IT Specialist roles.
// Optionally uses DeepSeek API for intelligent matching.

const UAE_JOB_BOARDS = [
  {
    name: 'Indeed UAE',
    url: (q: string) =>
      `https://ae.indeed.com/jobs?q=${encodeURIComponent(q)}&l=United+Arab+Emirates&sort=date&limit=50`,
  },
  {
    name: 'Gulftalent',
    url: (q: string) =>
      `https://www.gulftalent.com/jobs?keywords=${encodeURIComponent(q)}&country=AE`,
  },
  {
    name: 'Naukri Gulf',
    url: (q: string) =>
      `https://www.naukrigulf.com/jobs?keywords=${encodeURIComponent(q)}&location=uae`,
  },
]

const SEARCH_QUERIES = [
  'Data Analyst',
  'IT Specialist',
  'BI Analyst',
  'Business Intelligence',
  'Data Analytics',
  'IT Support Engineer',
  'Data Engineer',
  'Analytics Manager',
  'MIS Analyst',
]

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { deepseekKey, portals, profile } = req.body || {}
  const positiveKws = portals?.positiveKeywords || ['Data Analyst', 'IT Specialist']
  const negativeKws = portals?.negativeKeywords || ['Senior', 'Lead', 'Manager']

  const results: any[] = []
  const seen = new Set<string>()

  // Build search queries from profile + portals
  const queries = profile?.targetRoles
    ? profile.targetRoles.split(',').map((r: string) => r.trim()).filter(Boolean)
    : SEARCH_QUERIES

  // Try each job board with each query
  for (const board of UAE_JOB_BOARDS) {
    for (const q of queries) {
      try {
        const boardUrl = board.url(q)
        const response = await fetch(boardUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            Accept: 'text/html',
          },
          signal: AbortSignal.timeout(8000),
        })

        if (!response.ok) continue

        const html = await response.text()
        const jobs = parseJobListings(html, board.name)

        for (const job of jobs) {
          const key = `${job.company}|${job.title}`
          if (seen.has(key)) continue
          seen.add(key)

          // Filter out negative keywords
          const titleLower = job.title.toLowerCase()
          if (negativeKws.some((k: string) => titleLower.includes(k.toLowerCase()))) continue

          // Score the job
          const score = scoreJob(job, positiveKws, profile)

          results.push({
            id: results.length + 1,
            title: job.title,
            company: job.company,
            location: job.location || 'UAE',
            score,
            url: job.url,
            source: board.name,
          })
        }
      } catch {
        // Silently skip failed fetches
      }
    }
  }

  // Deduplicate by URL
  const byUrl = new Map<string, any>()
  for (const r of results) {
    if (!byUrl.has(r.url) || r.score > byUrl.get(r.url)!.score) {
      byUrl.set(r.url, r)
    }
  }

  // Sort by score descending
  const sorted = Array.from(byUrl.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)

  // If DeepSeek key is provided, do AI-enhanced analysis
  if (deepseekKey && sorted.length > 0) {
    try {
      const enhanced = await deepseekEnhance(sorted, deepseekKey, profile)
      return res.json({ jobs: enhanced, count: enhanced.length, source: 'deepseek' })
    } catch {
      // Fall through to return raw results
    }
  }

  return res.json({ jobs: sorted, count: sorted.length, source: 'scraped' })
}

function parseJobListings(html: string, source: string): any[] {
  const jobs: any[] = []

  if (source === 'Indeed UAE') {
    // Indeed job cards
    const cardRegex =
      /mosaic-provider-jobcards.*?>(.*?)<div class="mosaic-provider-jobcards/m
    const cardsMatch = html.match(cardRegex)
    const cardsHtml = cardsMatch ? cardsMatch[1] : html

    const jobRegex = /data-jk="([^"]+)"[\s\S]*?jobTitle[^>]*>([^<]+)<[\s\S]*?companyName[^>]*>([^<]+)<[\s\S]*?companyLocation[^>]*>([^<]+)</g
    let m: RegExpExecArray | null
    while ((m = jobRegex.exec(html)) !== null) {
      jobs.push({
        title: clean(m[2]),
        company: clean(m[3]),
        location: clean(m[4]),
        url: `https://ae.indeed.com/viewjob?jk=${m[1]}`,
      })
    }

    // Fallback: simpler title matching
    if (jobs.length === 0) {
      const titleRegex = /jobTitle[^>]*>([^<]+)</g
      const companyRegex = /companyName[^>]*>([^<]+)</g
      const locationRegex = /companyLocation[^>]*>([^<]+)</g
      const titles = [...html.matchAll(titleRegex)].slice(0, 10).map(m => clean(m[1]))
      const companies = [...html.matchAll(companyRegex)].slice(0, 10).map(m => clean(m[1]))
      const locations = [...html.matchAll(locationRegex)].slice(0, 10).map(m => clean(m[1]))

      for (let i = 0; i < Math.min(titles.length, 10); i++) {
        jobs.push({
          title: titles[i],
          company: companies[i] || 'UAE Company',
          location: locations[i] || 'UAE',
          url: `https://ae.indeed.com/jobs?q=${encodeURIComponent(titles[i])}`,
        })
      }
    }
  }

  if (source === 'Gulftalent') {
    const cardsRegex = /<div class="job-card"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g
    let m: RegExpExecArray | null
    while ((m = cardsRegex.exec(html)) !== null) {
      const card = m[1]
      const titleMatch = card.match(/<h2[^>]*>([^<]+)</)
      const companyMatch = card.match(/<span class="company"[^>]*>([^<]+)</)
      const urlMatch = card.match(/href="([^"]+)"/)
      if (titleMatch && companyMatch) {
        jobs.push({
          title: clean(titleMatch[1]),
          company: clean(companyMatch[1]),
          location: 'UAE',
          url: urlMatch ? `https://www.gulftalent.com${urlMatch[1]}` : '',
        })
      }
    }
  }

  if (source === 'Naukri Gulf') {
    const titleRegex = /class="job-title"[^>]*>([^<]+)</g
    const companyRegex = /class="company-name"[^>]*>([^<]+)</g
    const locationRegex = /class="location"[^>]*>([^<]+)</g
    const urlRegex = /href="(https:\/\/www\.naukrigulf\.com[^"]+)"/
    const titles = [...html.matchAll(titleRegex)].slice(0, 10).map(m => clean(m[1]))
    const companies = [...html.matchAll(companyRegex)].slice(0, 10).map(m => clean(m[1]))
    const locations = [...html.matchAll(locationRegex)].slice(0, 10).map(m => clean(m[1]))

    for (let i = 0; i < Math.min(titles.length, 10); i++) {
      jobs.push({
        title: titles[i],
        company: companies[i] || 'UAE Company',
        location: locations[i] || 'UAE',
        url: '',
      })
    }
  }

  return jobs
}

function scoreJob(
  job: { title: string; company: string; location: string },
  positiveKws: string[],
  profile: any,
): number {
  let score = 50 // base

  const titleLower = job.title.toLowerCase()
  const companyLower = job.company.toLowerCase()
  const locationLower = job.location.toLowerCase()

  // Match positive keywords
  for (const kw of positiveKws) {
    if (titleLower.includes(kw.toLowerCase())) score += 8
  }

  // UAE location bonus
  if (locationLower.includes('dubai') || locationLower.includes('abu dhabi') || locationLower.includes('uae') || locationLower.includes('united arab')) {
    score += 10
  }

  // Known UAE companies bonus
  const uaeCompanies = [
    'emirates', 'etihad', 'adnoc', 'dp world', 'emaar', 'fab', 'first abu dhabi',
    'careem', 'talabat', 'majid al futtaim', 'damac', 'aldar', 'mubadala',
    'etisalat', 'du', 'masdar', 'noor bank', 'unilever', 'pwc', 'deloitte',
    'kpmg', 'ey', 'accenture', 'citi', 'hsbc', 'standard chartered',
  ]
  for (const c of uaeCompanies) {
    if (companyLower.includes(c)) score += 5
  }

  // Target role exact match bonus from profile
  const targetRoles = profile?.targetRoles?.toLowerCase() || ''
  if (targetRoles && titleLower.includes(targetRoles)) score += 12

  return Math.min(Math.round(score), 100)
}

function clean(s: string): string {
  return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

async function deepseekEnhance(jobs: any[], apiKey: string, profile: any): Promise<any[]> {
  const prompt = `You are a UAE job search expert. Analyze these job listings for a candidate with this profile:
- Target roles: ${profile?.targetRoles || 'Data Analyst, IT Specialist'}
- Location preference: UAE (Dubai, Abu Dhabi)
- Needs visa sponsorship
- Key skills: ${profile?.superpowers?.join(', ') || 'Data Analysis, BI, IT Support'}

Rate each job from 0-100 based on fit. Return ONLY a JSON array with id and score fields:

${JSON.stringify(jobs.map(j => ({ id: j.id, title: j.title, company: j.company })))}

Return format: [{"id": 1, "score": 85}, ...]`

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

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`)
  }

  const data: any = await response.json()
  const content = data?.choices?.[0]?.message?.content

  if (!content) return jobs

  try {
    const scores = JSON.parse(content.replace(/```json\s*|\s*```/g, '').trim())
    const scoreMap = new Map(scores.map((s: any) => [s.id, s.score]))

    for (const job of jobs) {
      if (scoreMap.has(job.id)) {
        job.score = scoreMap.get(job.id)
      }
    }

    return jobs.sort((a, b) => b.score - a.score)
  } catch {
    return jobs
  }
}
