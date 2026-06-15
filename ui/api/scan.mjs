// Vercel Serverless Function — /api/scan
// Searches UAE job boards via Google Custom Search API (OAuth2 with service account).

const REGION_MAP = {
  'all': 'United Arab Emirates',
  'dubai': 'Dubai',
  'abu-dhabi': 'Abu Dhabi',
  'sharjah': 'Sharjah',
  'remote': 'Remote',
}

const GOOGLE_CX = process.env.GOOGLE_CX || ''
const GOOGLE_SA_B64 = process.env.GOOGLE_SERVICE_ACCOUNT || ''
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ''

const SEARCH_SITES = 'ae.indeed.com OR gulftalent.com OR naukrigulf.com OR bayt.com OR monstergulf.com'

const VISA_KEYWORDS = [
  'visa sponsorship', 'sponsor', 'work visa', 'employment visa', 'visa provided',
  'relocation package', 'relocation assistance', 'relocate', 'overseas',
  'international', 'expat', 'work permit',
]

async function getAccessToken(saJSON) {
  const { client_email, private_key } = saJSON
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: client_email,
    scope: 'https://www.googleapis.com/auth/cse',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url')
  const signatureInput = `${b64(header)}.${b64(payload)}`
  const sign = require('crypto').createSign('RSA-SHA256')
  sign.update(signatureInput)
  const signature = sign.sign(private_key, 'base64url')
  const assertion = `${signatureInput}.${signature}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  const tokenData = await tokenRes.json()
  return tokenData.access_token
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!GOOGLE_CX || !GOOGLE_SA_B64) {
    return res.status(500).json({ error: 'Google API not configured' })
  }

  const { deepseekKey: clientKey, portals, profile, region = 'all', visaSponsorship = true } = req.body || {}
  const deepseekKey = clientKey || DEEPSEEK_KEY
  const positiveKws = portals?.positiveKeywords || ['Data Analyst', 'IT Specialist']
  const negativeKws = portals?.negativeKeywords || ['Senior', 'Lead', 'Manager']

  const results = []
  const seen = new Set()

  const regionLabel = REGION_MAP[region] || 'UAE'
  const locationTerm = region === 'remote' ? 'Remote' : regionLabel

  const targetRoles = profile?.targetRoles
    ? profile.targetRoles.split(',').map(r => r.trim()).filter(Boolean)
    : ['Data Analyst', 'IT Specialist', 'BI Analyst']

  try {
    // Decode service account and get OAuth2 token
    const saJSON = JSON.parse(Buffer.from(GOOGLE_SA_B64, 'base64').toString('utf-8'))
    const accessToken = await getAccessToken(saJSON)

    for (const role of targetRoles) {
      try {
        const query = `${role} ${locationTerm} site:${SEARCH_SITES}`
        const url = `https://www.googleapis.com/customsearch/v1?cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}&num=10`
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(10000),
        })
        if (!response.ok) continue

        const data = await response.json()
        const items = data.items || []

        for (const item of items) {
          const title = item.title || ''
          const link = item.link || ''
          const snippet = item.snippet || ''

          const titleLower = title.toLowerCase()
          if (negativeKws.some(k => titleLower.includes(k.toLowerCase()))) continue

          const company = extractCompany(title, snippet)
          const location = extractLocation(snippet, regionLabel)

          const key = `${company}|${title}`
          if (seen.has(key)) continue
          seen.add(key)

          const hasVisa = VISA_KEYWORDS.some(kw =>
            `${title} ${snippet}`.toLowerCase().includes(kw)
          )
          if (visaSponsorship && !hasVisa) continue

          const score = scoreJob(title, company, location, positiveKws, region, hasVisa, targetRoles)

          results.push({
            id: results.length + 1,
            title,
            company,
            location: location || regionLabel,
            score,
            url: link,
            source: extractSource(link),
            visaSponsorship: hasVisa,
          })
        }
      } catch {
        // Silently skip
      }
    }
  } catch (err) {
    return res.status(500).json({ error: 'Auth failed: ' + (err.message || 'unknown') })
  }

  const sorted = results.sort((a, b) => b.score - a.score).slice(0, 30)

  if (deepseekKey && sorted.length > 0) {
    try {
      const enhanced = await deepseekEnhance(sorted, deepseekKey, profile, region, visaSponsorship)
      return res.json({ jobs: enhanced, count: enhanced.length, source: 'deepseek', deepseek: true })
    } catch {
      // Fall through
    }
  }

  return res.json({ jobs: sorted, count: sorted.length, source: 'google', deepseek: !!deepseekKey })
}

function extractCompany(title, snippet) {
  const atMatch = title.match(/\bat\s+([^-]+)/i)
  if (atMatch) return atMatch[1].trim()
  const dashMatch = title.match(/-\s*(.+)$/)
  if (dashMatch) return dashMatch[1].trim()
  const snipCompany = snippet.match(/(?:at|by|with)\s+([A-Z][A-Za-z0-9\s&.]+?)(?:\s+-\s+|\s+in\s+|\.|$)/)
  if (snipCompany) return snipCompany[1].trim()
  return 'UAE Company'
}

function extractLocation(snippet, regionLabel) {
  const locMatch = snippet.match(/\bin\s+([A-Za-z\s]+?)(?:\s*-\s*|\s*\.\s*|$)/)
  if (locMatch) {
    const loc = locMatch[1].trim()
    if (loc.length < 30) return loc
  }
  return regionLabel
}

function extractSource(url) {
  if (url.includes('indeed.com')) return 'Indeed'
  if (url.includes('gulftalent.com')) return 'Gulftalent'
  if (url.includes('naukrigulf.com')) return 'Naukri Gulf'
  if (url.includes('bayt.com')) return 'Bayt'
  if (url.includes('monstergulf.com')) return 'Monster Gulf'
  return 'Job Board'
}

function scoreJob(title, company, location, positiveKws, region, hasVisa, targetRoles) {
  let score = 50
  const titleLower = title.toLowerCase()
  const companyLower = company.toLowerCase()
  const locationLower = location.toLowerCase()

  for (const kw of positiveKws) {
    if (titleLower.includes(kw.toLowerCase())) score += 8
  }

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

  if (hasVisa) score += 12

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

  for (const role of targetRoles) {
    if (titleLower.includes(role.toLowerCase())) score += 12
  }

  return Math.min(Math.round(score), 100)
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
