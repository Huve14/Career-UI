import type { Application, PipelineItem, FollowUp, Profile, PortalConfig, ScanResult } from '../types'

const co = window.careerOps

// ── File Read/Write Helpers ───────────────────────────────────

async function readFile(path: string): Promise<string> {
  const result = await co.readFile(path)
  if (result.error) throw new Error(result.error)
  return result.content || ''
}

async function writeFile(path: string, content: string): Promise<void> {
  const result = await co.writeFile(path, content)
  if (result.error) throw new Error(result.error)
}

// ── Applications ──────────────────────────────────────────────

export async function loadApplications(): Promise<Application[]> {
  try {
    const content = await readFile('data/applications.md')
    return parseApplicationsTable(content)
  } catch {
    return []
  }
}

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

export async function saveApplications(apps: Application[]): Promise<void> {
  const header = '| # | Date | Company | Role | Score | Status | PDF | Report | Notes |\n|---|------|---------|------|-------|--------|-----|--------|-------|'
  const rows = apps.map(a =>
    `| ${a.id} | ${a.date} | ${a.company} | ${a.role} | ${a.score} | ${a.status} | ${a.pdf ? '✅' : '❌'} | ${a.report} | ${a.notes} |`
  )
  await writeFile('data/applications.md', `# Applications Tracker\n\n${header}\n${rows.join('\n')}\n`)
}

// ── Pipeline ──────────────────────────────────────────────────

export async function loadPipeline(): Promise<PipelineItem[]> {
  try {
    const content = await readFile('data/pipeline.md')
    return parsePipeline(content)
  } catch {
    return []
  }
}

function parsePipeline(md: string): PipelineItem[] {
  const urls = md.split('\n').filter(l => l.trim().startsWith('- ') && l.includes('http'))
  return urls.map((u, i) => ({
    id: i + 1,
    url: u.replace(/^-\s*/, '').trim(),
    added: new Date().toISOString().slice(0, 10),
  }))
}

export async function savePipeline(items: PipelineItem[]): Promise<void> {
  const urls = items.map(i => `- ${i.url}`).join('\n')
  await writeFile('data/pipeline.md', `# Pipeline Inbox\n\nPaste job URLs below to evaluate them:\n\n${urls}\n`)
}

// ── Follow-ups ────────────────────────────────────────────────

export async function loadFollowUps(): Promise<FollowUp[]> {
  try {
    const content = await readFile('data/follow-ups.md')
    return parseFollowUps(content)
  } catch {
    return []
  }
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

export async function saveFollowUps(items: FollowUp[]): Promise<void> {
  const header = '| # | Company | Role | Date | Type | Notes |\n|---|---------|------|------|------|-------|'
  const rows = items.map(f =>
    `| ${f.id} | ${f.company} | ${f.role} | ${f.date} | ${f.type} | ${f.notes} |`
  )
  await writeFile('data/follow-ups.md', `# Follow-up History\n\n${header}\n${rows.join('\n')}\n`)
}

// ── Profile ───────────────────────────────────────────────────

export async function loadProfile(): Promise<Profile> {
  try {
    const content = await readFile('config/profile.yml')
    return parseProfileYaml(content)
  } catch {
    return defaultProfile()
  }
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
    name: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    portfolioUrl: '',
    visaStatus: '',
    targetRoles: '',
    salaryMin: '',
    salaryMax: '',
    narrative: '',
    headline: '',
    superpowers: [],
  }
}

// ── CV ────────────────────────────────────────────────────────

export async function loadCv(): Promise<string> {
  try {
    return await readFile('cv.md')
  } catch {
    return '# Your CV\n\nPaste your CV here...\n'
  }
}

export async function saveCv(content: string): Promise<void> {
  await writeFile('cv.md', content)
}

// ── Portals ───────────────────────────────────────────────────

export async function loadPortals(): Promise<PortalConfig> {
  try {
    const content = await readFile('portals.yml')
    return parsePortalsYaml(content)
  } catch {
    return { positiveKeywords: [], negativeKeywords: [], companies: [] }
  }
}

function parsePortalsYaml(yml: string): PortalConfig {
  const positive: string[] = []
  const negative: string[] = []
  const companies: { name: string; url: string; enabled: boolean }[] = []

  let section = ''
  let inTracked = false

  for (const line of yml.split('\n')) {
    const trimmed = line.trim()

    if (trimmed === 'title_filter:') { section = 'filter'; continue }
    if (trimmed === 'positive:') { section = 'positive'; continue }
    if (trimmed === 'negative:') { section = 'negative'; continue }
    if (trimmed === 'tracked_companies:') { section = 'companies'; inTracked = true; continue }

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

export async function loadReports(): Promise<{ name: string; content: string }[]> {
  try {
    const { entries } = await co.listFiles('reports')
    const mdFiles = entries.filter(e => !e.isDirectory && e.name.endsWith('.md'))
    const reports = []
    for (const f of mdFiles) {
      try {
        const content = await readFile(`reports/${f.name}`)
        reports.push({ name: f.name, content })
      } catch { /* skip */ }
    }
    return reports
  } catch {
    return []
  }
}

export async function loadReport(name: string): Promise<string> {
  return readFile(`reports/${name}`)
}
