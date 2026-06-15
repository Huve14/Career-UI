// Vercel Serverless Function — /api/scan-live
// Hits public ATS APIs (Greenhouse, Ashby, Lever) directly — zero tokens.
// Filters results against the user's profile (target roles + skills from CV).

// Fallback keywords used when no profile is provided
const DEFAULT_KEYWORDS = [
  'data analyst', 'business intelligence', 'bi analyst', 'bi developer',
  'analytics engineer', 'it specialist', 'it manager', 'it support',
  'systems administrator', 'cloud administrator', 'data engineer',
  'automation engineer', 'solutions architect', 'sql developer',
  'ai automation', 'cybersecurity analyst', 'it infrastructure',
  'technical support', 'support engineer', 'technical analyst',
  'power bi', 'tableau', 'etl', 'data warehouse', 'forward deployed',
]

const TITLE_BLOCK = [
  'intern', 'director', 'vp ', 'vice president', 'head of', 'chief',
  'counsel', 'attorney', 'legal', 'recruiter', 'account executive',
  'account manager', 'sales development', 'marketing manager',
]

// Build a title keyword list from the user's profile
function buildKeywordsFromProfile(profile) {
  const keywords = new Set()

  // Split target roles: "Data Analyst, IT Specialist" → ['data analyst', 'it specialist']
  if (profile?.targetRoles) {
    for (const role of profile.targetRoles.split(',')) {
      const r = role.trim().toLowerCase()
      if (r.length > 2) keywords.add(r)
      // Also add individual words from multi-word roles
      for (const word of r.split(' ')) {
        if (word.length > 4) keywords.add(word)
      }
    }
  }

  // Extract role-like terms from headline
  if (profile?.headline) {
    const parts = profile.headline.split(/[|,&\-]/).map(s => s.trim().toLowerCase())
    for (const p of parts) {
      if (p.length > 3 && p.length < 40) keywords.add(p)
    }
  }

  // Skills that map to job titles
  const SKILL_TO_TITLE = {
    'power bi': 'power bi', 'tableau': 'tableau', 'sql': 'sql developer',
    'etl': 'etl', 'python': 'python', 'postgresql': 'database',
    'n8n': 'automation', 'zoho': 'zoho analytics', 'bi': 'business intelligence',
    'microsoft 365': 'it administrator', 'm365': 'it administrator',
    'azure': 'cloud administrator', 'aws': 'cloud administrator',
  }
  if (Array.isArray(profile?.superpowers)) {
    for (const sp of profile.superpowers) {
      const lower = sp.toLowerCase()
      for (const [skill, titleTerm] of Object.entries(SKILL_TO_TITLE)) {
        if (lower.includes(skill)) keywords.add(titleTerm)
      }
    }
  }

  return keywords.size > 0 ? [...keywords] : DEFAULT_KEYWORDS
}

function buildTitleFilter(keywords) {
  return (title) => {
    const lower = title.toLowerCase()
    if (TITLE_BLOCK.some(k => lower.includes(k))) return false
    return keywords.some(k => lower.includes(k))
  }
}
const COMPANIES = [
  // AI-first companies (most relevant for candidate profile)
  { name: 'Anthropic',        type: 'greenhouse', slug: 'anthropic' },
  { name: 'Mistral AI',       type: 'lever',      slug: 'mistral' },
  { name: 'Deepgram',         type: 'ashby',      slug: 'deepgram' },
  { name: 'Synthesia',        type: 'ashby',      slug: 'synthesia' },
  { name: 'Resend',           type: 'ashby',      slug: 'resend' },
  { name: 'Supabase',         type: 'ashby',      slug: 'supabase' },
  { name: 'Arize AI',         type: 'greenhouse', slug: 'arizeai' },
  { name: 'Hightouch',        type: 'greenhouse', slug: 'hightouch' },
  { name: 'RunPod',           type: 'greenhouse', slug: 'runpod' },
  { name: 'Pinecone',         type: 'ashby',      slug: 'pinecone' },
  { name: 'Weights & Biases', type: 'greenhouse', slug: 'wandb' },
  { name: 'Cohere',           type: 'greenhouse', slug: 'cohere' },
  { name: 'Scale AI',         type: 'greenhouse', slug: 'scaleai' },
  { name: 'Hugging Face',     type: 'greenhouse', slug: 'huggingface' },
  { name: 'Inngest',          type: 'ashby',      slug: 'inngest' },
  { name: 'Photoroom',        type: 'ashby',      slug: 'photoroom' },
  { name: 'Airtable',         type: 'greenhouse', slug: 'airtable' },
  // UAE / MENA-active companies
  { name: 'Careem',           type: 'ashby',      slug: 'careem' },
  { name: 'Tabby',            type: 'ashby',      slug: 'tabby' },
  { name: 'Tamara',           type: 'ashby',      slug: 'tamara' },
  { name: 'Lune',             type: 'ashby',      slug: 'lune' },
  { name: 'Property Finder',  type: 'greenhouse', slug: 'propertyfinder' },
  { name: 'Fetchr',           type: 'greenhouse', slug: 'fetchr' },
  { name: 'Kitopi',           type: 'greenhouse', slug: 'kitopi' },
  { name: 'Noon',             type: 'lever',      slug: 'noon' },
  // Global companies with UAE/MENA presence
  { name: 'Revolut',          type: 'greenhouse', slug: 'revolut' },
  { name: 'Stripe',           type: 'greenhouse', slug: 'stripe' },
  { name: 'Amplemarket',      type: 'greenhouse', slug: 'amplemarket' },
  { name: 'Amplemarket EU',   type: 'greenhouse', slug: 'amplemarket', region: 'eu' },
]


async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (e) {
    clearTimeout(timer)
    throw e
  }
}

async function scanGreenhouse(company) {
  const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${company.slug}/jobs`
  const json = await fetchWithTimeout(apiUrl, 8000)
  const jobs = Array.isArray(json?.jobs) ? json.jobs : []
  return jobs.map(j => ({
    title: j.title || '',
    url: j.absolute_url || '',
    company: company.name,
    location: j.location?.name || '',
  }))
}

async function scanAshby(company) {
  // Ashby is slow — give it up to 8s, retry once if it aborts
  const apiUrl = `https://api.ashbyhq.com/posting-api/job-board/${company.slug}?includeCompensation=true`
  let json
  try {
    json = await fetchWithTimeout(apiUrl, 8000)
  } catch {
    // one retry with fresh abort controller
    json = await fetchWithTimeout(apiUrl, 8000)
  }
  const jobs = Array.isArray(json?.jobs) ? json.jobs : []
  return jobs.map(j => ({
    title: j.title || '',
    url: j.jobUrl || '',
    company: company.name,
    location: j.location || '',
  }))
}

async function scanLever(company) {
  const apiUrl = `https://api.lever.co/v0/postings/${company.slug}`
  const json = await fetchWithTimeout(apiUrl)
  if (!Array.isArray(json)) return []
  return json.map(j => ({
    title: j.text || '',
    url: j.hostedUrl || '',
    company: company.name,
    location: j.categories?.location || '',
  }))
}

async function scanCompany(company, titleFilter) {
  try {
    let jobs
    if (company.type === 'greenhouse') jobs = await scanGreenhouse(company)
    else if (company.type === 'ashby') jobs = await scanAshby(company)
    else if (company.type === 'lever') jobs = await scanLever(company)
    else return []
    return jobs.filter(j => j.url && titleFilter(j.title))
  } catch {
    return []
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Profile from client — used to personalise the title filter
  const profile = req.body?.profile || null
  const keywords = buildKeywordsFromProfile(profile)
  const titleFilter = buildTitleFilter(keywords)

  const extraCompanies = req.body?.companies || []
  const allCompanies = [...COMPANIES, ...extraCompanies]

  const results = await Promise.all(allCompanies.map(c => scanCompany(c, titleFilter)))
  const jobs = results.flat()

  // Deduplicate by URL
  const seen = new Set()
  const unique = jobs.filter(j => {
    if (!j.url || seen.has(j.url)) return false
    seen.add(j.url)
    return true
  })

  // Sort: UAE/MENA location first, then alphabetical by company
  unique.sort((a, b) => {
    const aUAE = /uae|dubai|abu dhabi|sharjah|mena|remote/i.test(a.location)
    const bUAE = /uae|dubai|abu dhabi|sharjah|mena|remote/i.test(b.location)
    if (aUAE !== bUAE) return aUAE ? -1 : 1
    return a.company.localeCompare(b.company)
  })

  // No edge caching — always hit ATS APIs fresh on every scan click
  res.setHeader('Cache-Control', 'no-store')
  return res.json({ jobs: unique, count: unique.length, scanned: allCompanies.length, ts: new Date().toISOString() })
}
