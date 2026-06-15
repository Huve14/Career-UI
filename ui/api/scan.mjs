// Vercel Serverless Function — /api/scan
// Scans multiple job boards for UAE roles with region + visa sponsorship filters.

const REGION_MAP = {
  'all': 'United Arab Emirates',
  'dubai': 'Dubai',
  'abu-dhabi': 'Abu Dhabi',
  'sharjah': 'Sharjah',
  'remote': 'Remote',
}

const UAE_JOB_BOARDS = [
  {
    name: 'Indeed UAE',
    url: (q, region) => {
      const loc = REGION_MAP[region] || 'United Arab Emirates'
      return `https://ae.indeed.com/jobs?q=${encodeURIComponent(q)}&l=${encodeURIComponent(loc)}&sort=date&limit=50`
    },
  },
  {
    name: 'Gulftalent',
    url: (q, _region) =>
      `https://www.gulftalent.com/jobs?keywords=${encodeURIComponent(q)}&country=AE`,
  },
  {
    name: 'Naukri Gulf',
    url: (q, _region) =>
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
  'IT Administrator',
  'Systems Analyst',
]

const VISA_KEYWORDS = [
  'visa sponsorship', 'sponsor', 'work visa', 'employment visa', 'visa provided',
  'relocation package', 'relocation assistance', 'relocate', 'overseas',
  'international', 'expat', 'work permit',
]

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { deepseekKey: clientKey, portals, profile, region = 'all', visaSponsorship = true } = req.body || {}
  const deepseekKey = clientKey || process.env.DEEPSEEK_API_KEY || ''
  const positiveKws = portals?.positiveKeywords || ['Data Analyst', 'IT Specialist']
  const negativeKws = portals?.negativeKeywords || ['Senior', 'Lead', 'Manager']

  const results = []
  const seen = new Set()

  const queries = profile?.targetRoles
    ? profile.targetRoles.split(',').map(r => r.trim()).filter(Boolean)
    : SEARCH_QUERIES

  for (const board of UAE_JOB_BOARDS) {
    for (const q of queries) {
      try {
        const boardUrl = board.url(q, region)
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

          const titleLower = job.title.toLowerCase()
          if (negativeKws.some(k => titleLower.includes(k.toLowerCase()))) continue

          const hasVisa = detectVisaSponsorship(job, html)
          if (visaSponsorship && !hasVisa) continue

          const score = scoreJob(job, positiveKws, profile, region, hasVisa)

          results.push({
            id: results.length + 1,
            title: job.title,
            company: job.company,
            location: job.location || 'UAE',
            score,
            url: job.url,
            source: board.name,
            visaSponsorship: hasVisa,
          })
        }
      } catch {
        // Silently skip
      }
    }
  }

  // Sort by score descending
  const sorted = results.sort((a, b) => b.score - a.score).slice(0, 30)

  // DeepSeek AI enhancement
  if (deepseekKey && sorted.length > 0) {
    try {
      const enhanced = await deepseekEnhance(sorted, deepseekKey, profile, region, visaSponsorship)
      return res.json({ jobs: enhanced, count: enhanced.length, source: 'deepseek', deepseek: true })
    } catch {
      // Fall through
    }
  }

  return res.json({
    jobs: sorted,
    count: sorted.length,
    source: deepseekKey ? 'deepseek' : 'scraped',
    deepseek: !!deepseekKey,
  })
}

function parseJobListings(html, source) {
  const jobs = []

  if (source === 'Indeed UAE') {
    const jobRegex = /data-jk="([^"]+)"[\s\S]*?jobTitle[^>]*>([^<]+)<[\s\S]*?companyName[^>]*>([^<]+)<[\s\S]*?companyLocation[^>]*>([^<]+)</g
    let m
    while ((m = jobRegex.exec(html)) !== null) {
      jobs.push({
        title: clean(m[2]),
        company: clean(m[3]),
        location: clean(m[4]),
        url: `https://ae.indeed.com/viewjob?jk=${m[1]}`,
      })
    }

    if (jobs.length === 0) {
      const titleRegex = /jobTitle[^>]*>([^<]+)</g
      const companyRegex = /companyName[^>]*>([^<]+)</g
      const locationRegex = /companyLocation[^>]*>([^<]+)</g
      const titles = [...html.matchAll(titleRegex)].slice(0, 15).map(m => clean(m[1]))
      const companies = [...html.matchAll(companyRegex)].slice(0, 15).map(m => clean(m[1]))
      const locations = [...html.matchAll(locationRegex)].slice(0, 15).map(m => clean(m[1]))

      for (let i = 0; i < Math.min(titles.length, 15); i++) {
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
    let m
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
    const titles = [...html.matchAll(titleRegex)].slice(0, 15).map(m => clean(m[1]))
    const companies = [...html.matchAll(companyRegex)].slice(0, 15).map(m => clean(m[1]))
    const locations = [...html.matchAll(locationRegex)].slice(0, 15).map(m => clean(m[1]))

    for (let i = 0; i < Math.min(titles.length, 15); i++) {
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

function detectVisaSponsorship(job, rawHtml) {
  const text = `${job.title} ${job.company} ${job.description || ''} ${rawHtml || ''}`.toLowerCase()
  return VISA_KEYWORDS.some(kw => text.includes(kw))
}

function scoreJob(job, positiveKws, profile, region, hasVisa) {
  let score = 50

  const titleLower = job.title.toLowerCase()
  const companyLower = job.company.toLowerCase()
  const locationLower = job.location.toLowerCase()

  for (const kw of positiveKws) {
    if (titleLower.includes(kw.toLowerCase())) score += 8
  }

  // Region match
  if (region === 'all') {
    if (locationLower.includes('dubai')) score += 10
    if (locationLower.includes('abu dhabi')) score += 10
    if (locationLower.includes('uae') || locationLower.includes('united arab')) score += 5
  } else if (region === 'dubai' && locationLower.includes('dubai')) {
    score += 15
  } else if (region === 'abu-dhabi' && locationLower.includes('abu dhabi')) {
    score += 15
  } else if (region === 'remote' && (locationLower.includes('remote') || locationLower.includes('work from home') || locationLower.includes('wfh'))) {
    score += 15
  } else if (region === 'sharjah' && locationLower.includes('sharjah')) {
    score += 15
  }

  // Visa sponsorship bonus
  if (hasVisa) score += 12

  // Known UAE companies
  const uaeCompanies = [
    'emirates', 'etihad', 'adnoc', 'dp world', 'emaar', 'fab', 'first abu dhabi',
    'careem', 'talabat', 'majid al futtaim', 'damac', 'aldar', 'mubadala',
    'etisalat', 'du', 'masdar', 'noor bank', 'unilever', 'pwc', 'deloitte',
    'kpmg', 'ey', 'accenture', 'citi', 'hsbc', 'standard chartered',
    'amazon', 'google', 'microsoft', 'oracle', 'ibm',
  ]
  for (const c of uaeCompanies) {
    if (companyLower.includes(c)) score += 5
  }

  const targetRoles = (profile?.targetRoles || '').toLowerCase()
  if (targetRoles && titleLower.includes(targetRoles)) score += 12

  return Math.min(Math.round(score), 100)
}

function clean(s) {
  return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

async function deepseekEnhance(jobs, apiKey, profile, region, visaSponsorship) {
  const regionLabel = REGION_MAP[region] || 'UAE'
  const prompt = `You are a UAE job search expert. Analyze these listings for a candidate with:
- Target roles: ${profile?.targetRoles || 'Data Analyst, IT Specialist'}
- Location: ${regionLabel}${visaSponsorship ? '\n- MUST have visa sponsorship' : ''}
- Skills: ${profile?.superpowers?.join(', ') || 'Data Analysis, BI, IT Support'}

Rate each job 0-100 on fit. Also set "visaSponsorship": true/false based on whether the role likely offers UAE visa sponsorship.

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
