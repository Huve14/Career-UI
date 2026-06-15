import type { Application, PipelineItem, FollowUp, Profile, PortalConfig } from '../types'

// ── Storage Adapter ────────────────────────────────────────────
// Auto-detects Electron vs browser environment

const isElectron = !!(window.careerOps?.readFile)

const STORAGE_KEY = 'career-ops-data'

interface StorageData {
  applications: Application[]
  pipeline: PipelineItem[]
  followUps: FollowUp[]
  profile: Profile
  portals: PortalConfig
  cv: string
}

export function getDefaultData(): StorageData {
  return {
    applications: [],
    pipeline: [],
    followUps: [],
    profile: {} as Profile,
    portals: { positiveKeywords: [], negativeKeywords: [], companies: [] },
    cv: '# Your CV\n\nPaste your CV here in Markdown format...\n',
  }
}

export function loadStorage(): StorageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return getDefaultData()
}

export function saveStorage(data: StorageData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

// ── Electron File Helpers ──────────────────────────────────────

async function electronReadFile(path: string): Promise<string> {
  const result = await window.careerOps!.readFile(path)
  if (result.error) throw new Error(result.error)
  return result.content || ''
}

async function electronWriteFile(path: string, content: string): Promise<void> {
  const result = await window.careerOps!.writeFile(path, content)
  if (result.error) throw new Error(result.error)
}

// ── Applications ──────────────────────────────────────────────

export async function loadApplications(): Promise<Application[]> {
  if (isElectron) {
    try {
      const content = await electronReadFile('data/applications.md')
      return parseApplicationsTable(content)
    } catch { return [] }
  }
  // Browser: fetch live from GitHub
  const content = await fetchGitHubRaw('data/applications.md')
  if (content) return parseApplicationsTable(content)
  return loadStorage().applications
}

export async function saveApplications(apps: Application[]): Promise<void> {
  if (isElectron) {
    const header = '| # | Date | Company | Role | Score | Status | PDF | Report | Notes |\n|---|------|---------|------|-------|--------|-----|--------|-------|'
    const rows = apps.map(a =>
      `| ${a.id} | ${a.date} | ${a.company} | ${a.role} | ${a.score} | ${a.status} | ${a.pdf ? '✅' : '❌'} | ${a.report} | ${a.notes} |`
    )
    await electronWriteFile('data/applications.md', `# Applications Tracker\n\n${header}\n${rows.join('\n')}\n`)
    return
  }
  const data = loadStorage()
  data.applications = apps
  saveStorage(data)
}

// ── Pipeline ──────────────────────────────────────────────────

const GITHUB_RAW = 'https://raw.githubusercontent.com/Huve14/Career-UI/main'

async function fetchGitHubRaw(path: string): Promise<string | null> {
  try {
    const res = await fetch(`${GITHUB_RAW}/${path}`)
    if (res.ok) return res.text()
  } catch { /* network error */ }
  return null
}

export async function loadPipeline(): Promise<PipelineItem[]> {
  if (isElectron) {
    try {
      const content = await electronReadFile('data/pipeline.md')
      return parsePipeline(content)
    } catch { return [] }
  }
  // Browser: fetch live from GitHub (data/pipeline.md is committed by daily scan)
  const content = await fetchGitHubRaw('data/pipeline.md')
  if (content) return parsePipeline(content)
  return loadStorage().pipeline
}

export async function savePipeline(items: PipelineItem[]): Promise<void> {
  if (isElectron) {
    const urls = items.map(i => `- ${i.url}`).join('\n')
    await electronWriteFile('data/pipeline.md', `# Pipeline Inbox\n\nPaste job URLs below to evaluate them:\n\n${urls}\n`)
    return
  }
  const data = loadStorage()
  data.pipeline = items
  saveStorage(data)
}

// ── Follow-ups ────────────────────────────────────────────────

export async function loadFollowUps(): Promise<FollowUp[]> {
  if (isElectron) {
    try {
      const content = await electronReadFile('data/follow-ups.md')
      return parseFollowUps(content)
    } catch { return [] }
  }
  return loadStorage().followUps
}

export async function saveFollowUps(items: FollowUp[]): Promise<void> {
  if (isElectron) {
    const header = '| # | Company | Role | Date | Type | Notes |\n|---|---------|------|------|------|-------|'
    const rows = items.map(f =>
      `| ${f.id} | ${f.company} | ${f.role} | ${f.date} | ${f.type} | ${f.notes} |`
    )
    await electronWriteFile('data/follow-ups.md', `# Follow-up History\n\n${header}\n${rows.join('\n')}\n`)
    return
  }
  const data = loadStorage()
  data.followUps = items
  saveStorage(data)
}

// ── Profile ───────────────────────────────────────────────────

export async function loadProfile(): Promise<Profile> {
  if (isElectron) {
    try {
      const content = await electronReadFile('config/profile.yml')
      return parseProfileYaml(content)
    } catch { return defaultProfile() }
  }
  return loadStorage().profile
}

export async function saveProfileYaml(profile: Profile): Promise<void> {
  if (isElectron) {
    const yaml = `# Career-Ops Profile Configuration
candidate:
  full_name: "${profile.name}"
  email: "${profile.email}"
  phone: "${profile.phone}"
  location: "${profile.location}"
  linkedin: "${profile.linkedin}"
  portfolio_url: "${profile.portfolioUrl}"

target_roles:
  primary:
${profile.targetRoles.split(',').map(r => `    - "${r.trim()}"`).join('\n')}

narrative:
  headline: "${profile.headline || ''}"
  exit_story: "${profile.narrative || ''}"
  superpowers:
${profile.superpowers.map(s => `    - "${s}"`).join('\n')}

compensation:
  target_range: "Negotiable"
  currency: "AED"
  minimum: "Negotiable"
  location_flexibility: "Open to Abu Dhabi, Dubai, wider UAE"

location:
  country: "South Africa"
  city: "Johannesburg"
  timezone: "SAST"
  visa_status: "${profile.visaStatus}"`
    await electronWriteFile('config/profile.yml', yaml)
    return
  }
  const data = loadStorage()
  data.profile = profile
  saveStorage(data)
}

// ── CV ────────────────────────────────────────────────────────

export async function loadCv(): Promise<string> {
  if (isElectron) {
    try { return await electronReadFile('cv.md') }
    catch { return '# Your CV\n\nPaste your CV here...\n' }
  }
  return loadStorage().cv
}

export async function saveCv(content: string): Promise<void> {
  if (isElectron) {
    await electronWriteFile('cv.md', content)
    return
  }
  const data = loadStorage()
  data.cv = content
  saveStorage(data)
}

// ── Portals ───────────────────────────────────────────────────

export async function loadPortals(): Promise<PortalConfig> {
  if (isElectron) {
    try {
      const content = await electronReadFile('portals.yml')
      return parsePortalsYaml(content)
    } catch { return { positiveKeywords: [], negativeKeywords: [], companies: [] } }
  }
  return loadStorage().portals
}

export async function savePortalsYaml(config: PortalConfig): Promise<void> {
  if (!isElectron) {
    const data = loadStorage()
    data.portals = config
    saveStorage(data)
  }
}

// ── Seed: Import career-ops file content manually (browser mode) ──

export async function seedFromFiles(
  applicationsContent?: string,
  cvContent?: string,
  profileYaml?: string,
  pipelineContent?: string,
  followUpsContent?: string,
  portalsYaml?: string,
): Promise<void> {
  const data = getDefaultData()

  if (applicationsContent) data.applications = parseApplicationsTable(applicationsContent)
  if (cvContent) data.cv = cvContent
  if (pipelineContent) data.pipeline = parsePipeline(pipelineContent)
  if (followUpsContent) data.followUps = parseFollowUps(followUpsContent)
  if (profileYaml) data.profile = parseProfileYaml(profileYaml)
  if (portalsYaml) data.portals = parsePortalsYaml(portalsYaml)

  saveStorage(data)
}

// ── Parsers (shared between Electron and browser modes) ───────

function parseApplicationsTable(md: string): Application[] {
  const lines = md.split('\n').filter(l => l.trim().startsWith('|') && !l.includes('---') && !l.includes('| # |'))
  return lines.slice(1).map((line, i) => {
    const cols = line.split('|').map(c => c.trim()).filter(Boolean)
    if (cols.length < 9) return null
    const score = parseFloat(cols[4]) || 0
    return {
      id: i + 1,
      date: cols[0],
      company: cols[1],
      role: cols[2],
      score,
      status: cols[5] as Application['status'],
      pdf: cols[6] === '✅',
      report: cols[7],
      notes: cols[8] || '',
    }
  }).filter(Boolean) as Application[]
}

function parsePipeline(md: string): PipelineItem[] {
  const today = new Date().toISOString().slice(0, 10)
  return md.split('\n')
    .filter(l => l.trim().startsWith('- [ ]') && l.includes('http'))
    .map((line, i) => {
      const urlMatch = line.match(/https?:\/\/[^\s|]+/)
      if (!urlMatch) return null
      const url = urlMatch[0].replace(/\|.*$/, '').trim()
      const parts = line.split('|').map(p => p.trim())
      const company = parts[1] || ''
      const role = parts[2] || ''
      return { id: i + 1, url, added: today, company, role }
    })
    .filter(Boolean) as PipelineItem[]
}

function parseFollowUps(md: string): FollowUp[] {
  const lines = md.split('\n').filter(l => l.trim().startsWith('|') && !l.includes('---') && !l.includes('| # |'))
  return lines.slice(1).map(line => {
    const cols = line.split('|').map(c => c.trim()).filter(Boolean)
    if (cols.length < 6) return null
    const date = cols[3]
    const overdue = date ? (new Date(date) < new Date(Date.now() - 7 * 86400000)) : false
    return {
      id: parseInt(cols[0]) || Date.now(),
      company: cols[1],
      role: cols[2],
      date,
      type: cols[4],
      notes: cols[5] || '',
      overdue,
    }
  }).filter(Boolean) as FollowUp[]
}

function parseProfileYaml(yml: string): Profile {
  const get = (key: string): string => {
    const re = new RegExp(`^${key}:\\s*["']?(.*?)["']?\\s*$`, 'm')
    const m = yml.match(re)
    return m ? m[1].replace(/^["']|["']$/g, '') : ''
  }
  const getList = (key: string): string[] => {
    const lines = yml.split('\n')
    const idx = lines.findIndex(l => l.trim() === `${key}:`)
    if (idx === -1) return []
    const items: string[] = []
    for (let i = idx + 1; i < lines.length; i++) {
      const trimmed = lines[i].trim()
      if (trimmed.startsWith('- ')) items.push(trimmed.slice(2).trim())
      else if (trimmed.startsWith('#')) continue
      else if (trimmed && !trimmed.startsWith('- ')) break
    }
    return items
  }
  return {
    name: get('full_name'),
    email: get('email'),
    phone: get('phone'),
    location: get('location'),
    linkedin: get('linkedin'),
    portfolioUrl: get('portfolio_url'),
    visaStatus: get('visa_status'),
    targetRoles: getList('primary').join(', '),
    salaryMin: '',
    salaryMax: '',
    narrative: get('exit_story'),
    headline: get('headline'),
    superpowers: getList('superpowers'),
  }
}

function defaultProfile(): Profile {
  return {
    name: '', email: '', phone: '', location: '', linkedin: '', portfolioUrl: '',
    visaStatus: '', targetRoles: '', salaryMin: '', salaryMax: '',
    narrative: '', headline: '', superpowers: [],
  }
}

function parsePortalsYaml(yml: string): PortalConfig {
  const positive: string[] = []
  const negative: string[] = []
  const companies: { name: string; url: string; enabled: boolean }[] = []
  let section = ''

  for (const line of yml.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === 'title_filter:') { section = 'filter'; continue }
    if (trimmed === 'positive:') { section = 'positive'; continue }
    if (trimmed === 'negative:') { section = 'negative'; continue }
    if (trimmed === 'tracked_companies:') { section = 'companies'; continue }

    if (section === 'positive' && trimmed.startsWith('- ')) {
      positive.push(trimmed.slice(2).replace(/^["']|["']$/g, ''))
    }
    if (section === 'negative' && trimmed.startsWith('- ')) {
      negative.push(trimmed.slice(2).replace(/^["']|["']$/g, ''))
    }
    if (section === 'companies' && trimmed === 'job_boards:') break
    if (section !== 'companies') continue

    const nameMatch = trimmed.match(/^-\s*name:\s*["']?(.+?)["']?\s*$/)
    if (nameMatch) companies.push({ name: nameMatch[1], url: '', enabled: true })
    else if (trimmed.startsWith('careers_url:')) {
      const url = trimmed.split(':').slice(1).join(':').trim().replace(/^["']|["']$/g, '')
      if (companies.length) companies[companies.length - 1].url = url
    } else if (trimmed.startsWith('enabled:')) {
      const val = trimmed.split(':')[1].trim()
      if (companies.length) companies[companies.length - 1].enabled = val === 'true'
    }
  }

  return {
    positiveKeywords: positive,
    negativeKeywords: negative,
    companies: companies.map((c, i) => ({ ...c, id: i + 1 })),
  }
}

// ── Reports ───────────────────────────────────────────────────

export async function loadReport(name: string): Promise<string> {
  if (isElectron) {
    return electronReadFile(`reports/${name}`)
  }
  return ''
}

export async function loadReports(): Promise<{ name: string; content: string }[]> {
  if (isElectron) {
    try {
      const { entries } = await window.careerOps!.listFiles('reports')
      const mdFiles = entries.filter((e: { name: string; isDirectory: boolean }) => !e.isDirectory && e.name.endsWith('.md'))
      const reports: { name: string; content: string }[] = []
      for (const f of mdFiles) {
        try {
          const content = await electronReadFile(`reports/${f.name}`)
          reports.push({ name: f.name, content })
        } catch { /* skip */ }
      }
      return reports
    } catch { return [] }
  }
  return []
}
