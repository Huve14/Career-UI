import { useState, useEffect, useRef } from 'react'
import { useApp } from '../lib/context'

const REGIONS = [
  { value: 'all', label: 'All UAE' },
  { value: 'dubai', label: 'Dubai' },
  { value: 'abu-dhabi', label: 'Abu Dhabi' },
  { value: 'sharjah', label: 'Sharjah' },
  { value: 'remote', label: 'Remote / WFH' },
]

const CX = '61294f5963fcd4a85'

const SEARCH_SITES = 'ae.indeed.com OR gulftalent.com OR naukrigulf.com OR bayt.com OR monstergulf.com'

const VISA_KEYWORDS = [
  'visa sponsorship', 'sponsor', 'work visa', 'employment visa', 'visa provided',
  'relocation package', 'relocation assistance', 'relocate', 'overseas',
  'international', 'expat', 'work permit',
]

const UAE_COMPANIES = [
  'emirates', 'etihad', 'adnoc', 'dp world', 'emaar', 'fab', 'first abu dhabi',
  'careem', 'talabat', 'majid al futtaim', 'damac', 'aldar', 'mubadala',
  'etisalat', 'du', 'masdar', 'noor bank', 'unilever', 'pwc', 'deloitte',
  'kpmg', 'ey', 'accenture', 'citi', 'hsbc', 'standard chartered',
  'amazon', 'google', 'microsoft', 'oracle', 'ibm',
]

declare global {
  interface Window { google?: { search?: { cse?: { element?: { go: (q: string) => void } } } } }
}

export default function ScanJobs() {
  const { showToast, portals, profile } = useApp()
  const [scanning, setScanning] = useState(false)
  const [region, setRegion] = useState('all')
  const [visaSponsorship, setVisaSponsorship] = useState(true)
  const [scanResults, setScanResults] = useState<any[]>([])
  const searchRootRef = useRef<HTMLDivElement>(null)
  const resultsQueueRef = useRef<any[]>([])
  const queryIndexRef = useRef(0)
  const queriesRef = useRef<string[]>([])

  const regionLabel = REGIONS.find(r => r.value === region)?.label || 'All UAE'
  const locationTerm = region === 'remote' ? 'Remote' : regionLabel

  // Load CSE script once
  useEffect(() => {
    if (document.querySelector('script[src*="cse.google.com/cse.js"]')) return
    const s = document.createElement('script')
    s.src = `https://cse.google.com/cse.js?cx=${CX}`
    s.async = true
    document.head.appendChild(s)
  }, [])

  const extractCompany = (title: string, snippet: string): string => {
    const atMatch = title.match(/\bat\s+([^-]+)/i)
    if (atMatch) return atMatch[1].trim()
    const dashMatch = title.match(/-\s*(.+)$/)
    if (dashMatch) return dashMatch[1].trim()
    const snipCompany = snippet.match(/(?:at|by|with)\s+([A-Z][A-Za-z0-9\s&.]+?)(?:\s+-\s+|\s+in\s+|\.|$)/)
    if (snipCompany) return snipCompany[1].trim()
    return 'UAE Company'
  }

  const extractSource = (url: string): string => {
    if (url.includes('indeed.com')) return 'Indeed'
    if (url.includes('gulftalent.com')) return 'Gulftalent'
    if (url.includes('naukrigulf.com')) return 'Naukri Gulf'
    if (url.includes('bayt.com')) return 'Bayt'
    if (url.includes('monstergulf.com')) return 'Monster Gulf'
    return 'Job Board'
  }

  const scoreJob = (title: string, company: string, location: string, hasVisa: boolean): number => {
    let score = 50
    const titleLower = title.toLowerCase()
    const companyLower = company.toLowerCase()
    const locationLower = location.toLowerCase()
    const positiveKws = portals?.positiveKeywords || ['Data Analyst', 'IT Specialist']
    const negativeKws = portals?.negativeKeywords || ['Senior', 'Lead', 'Manager']

    if (negativeKws.some((k: string) => titleLower.includes(k.toLowerCase()))) return 0

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

    for (const c of UAE_COMPANIES) {
      if (companyLower.includes(c)) score += 5
    }

    const targetRoles = (profile?.targetRoles || '').toLowerCase()
    if (targetRoles && titleLower.includes(targetRoles)) score += 12

    return Math.min(Math.round(score), 100)
  }

  const processSearchResults = () => {
    if (!searchRootRef.current) return
    const seen = new Set<string>()
    const newResults: any[] = []
    const negativeKws = portals?.negativeKeywords || ['Senior', 'Lead', 'Manager']

    // Parse all result containers
    const containers = searchRootRef.current.querySelectorAll('.gsc-webResult.gsc-result, .gsc-webresult')
    containers.forEach(el => {
      const titleEl = el.querySelector('.gs-title a.gs-title, .gs-title')
      const urlEl = el.querySelector('.gs-title a.gs-title') || el.querySelector('a.gs-title')
      const snippetEl = el.querySelector('.gs-snippet')
      const richEl = el.querySelector('.gs-visibleUrl, .gs-visibleUrl-short')

      const title = titleEl?.textContent?.trim() || ''
      const url = (urlEl as HTMLAnchorElement)?.href || ''
      const snippet = snippetEl?.textContent?.trim() || ''
      const displayUrl = richEl?.textContent?.trim() || ''

      if (!title) return
      if (negativeKws.some((k: string) => title.toLowerCase().includes(k.toLowerCase()))) return

      const company = extractCompany(title, snippet)
      const location = displayUrl || regionLabel
      const key = `${company}|${title}`
      if (seen.has(key)) return
      seen.add(key)

      const allText = `${title} ${snippet} ${displayUrl}`.toLowerCase()
      const hasVisa = VISA_KEYWORDS.some(kw => allText.includes(kw))
      if (visaSponsorship && !hasVisa) return

      newResults.push({
        id: Date.now() + Math.random(),
        title,
        company,
        location: regionLabel,
        score: scoreJob(title, company, regionLabel, hasVisa),
        url,
        source: extractSource(url),
        visaSponsorship: hasVisa,
        snippet,
        processed: false,
      })
    })

    resultsQueueRef.current = [...resultsQueueRef.current, ...newResults]
  }

  const submitToBackend = async (jobs: any[]) => {
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portals,
          profile,
          region,
          visaSponsorship,
          clientJobs: jobs,
        }),
      })
      if (!res.ok) return jobs
      const data = await res.json()
      if (data.jobs) return data.jobs
      return jobs
    } catch {
      // Score client-side with DeepSeek as fallback
      return scoreWithDeepSeek(jobs)
    }
  }

  const scoreWithDeepSeek = async (jobs: any[]): Promise<any[]> => {
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portals,
          profile,
          region,
          visaSponsorship,
          scoreOnly: jobs.map(j => ({
            id: j.id, title: j.title, company: j.company, location: j.location,
          })),
        }),
      })
      if (!res.ok) return jobs
      const data = await res.json()
      if (data.scores) {
        for (const job of jobs) {
          const s = data.scores.find((x: any) => x.id === job.id)
          if (s) {
            job.score = s.score
            if (s.visaSponsorship !== undefined) job.visaSponsorship = s.visaSponsorship
          }
        }
      }
      return jobs
    } catch {
      return jobs
    }
  }

  const triggerScan = async () => {
    if (scanning) return
    setScanning(true)
    setScanResults([])
    resultsQueueRef.current = []

    const targetRoles = profile?.targetRoles
      ? profile.targetRoles.split(',').map((r: string) => r.trim()).filter(Boolean)
      : ['Data Analyst', 'IT Specialist']

    const queries = targetRoles.map((role: string) => `${role} ${locationTerm} site:${SEARCH_SITES}`)
    queriesRef.current = queries
    queryIndexRef.current = 0

    // Start first search
    runNextSearch()
  }

  const runNextSearch = () => {
    const idx = queryIndexRef.current
    if (idx >= queriesRef.current.length) {
      finishScan()
      return
    }

    const query = queriesRef.current[idx]
    queryIndexRef.current = idx + 1

    // Render search element
    if (searchRootRef.current) {
      searchRootRef.current.innerHTML = `<div class="gcse-search" data-query="${encodeURIComponent(query)}"></div>`
    }

    // Wait for results then proceed
    const checkDone = () => {
      // Give CSE time to render results
      setTimeout(() => {
        processSearchResults()

        // Clear for next query
        if (searchRootRef.current) searchRootRef.current.innerHTML = ''
        runNextSearch()
      }, 4000)
    }

    // If Google CSE API is available, use programmatic search
    if (window.google?.search?.cse?.element?.go) {
      setTimeout(() => {
        try { window.google!.search!.cse!.element!.go(query) } catch {}
        checkDone()
      }, 500)
    } else {
      setTimeout(checkDone, 1000)
    }
  }

  const finishScan = async () => {
    let jobs = resultsQueueRef.current

    // Deduplicate
    const seen = new Set<string>()
    jobs = jobs.filter(j => {
      const key = `${j.company}|${j.title}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    if (jobs.length === 0) {
      showToast('No matching jobs found')
      setScanning(false)
      return
    }

    // Send to backend for DeepSeek scoring
    const scored = await submitToBackend(jobs)
    scored.sort((a: any, b: any) => b.score - a.score)
    setScanResults(scored.slice(0, 30))
    showToast(`${Math.min(scored.length, 30)} jobs found (AI scored)`)
    setScanning(false)
  }

  const scoreLevel = (s: number) => s >= 85 ? 'high' : s >= 65 ? 'mid' : 'low'

  return (
    <div className="view-wrap" style={{ padding: '36px 40px', maxWidth: 860 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5, margin: '0 0 5px' }}>Scan Jobs</h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>
          Search UAE job boards with Google + AI-powered matching.
        </p>
      </div>

      <div className="card" style={{ padding: '20px 22px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Run Scanner</div>
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Region</label>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {REGIONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => setRegion(r.value)}
                  className={`btn btn-xs ${region === r.value ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: 11.5 }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Filters</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={visaSponsorship}
                onChange={e => setVisaSponsorship(e.target.checked)}
                style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
              />
              Visa Sponsorship required
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={triggerScan} disabled={scanning}>
            {scanning ? (
              <>
                <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.75s linear infinite', flexShrink: 0 }}></div>
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <span>{scanResults.length > 0 ? 'Scan Again' : 'Start Scan'}</span>
              </>
            )}
          </button>
          {scanResults.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
              Last: {regionLabel}{visaSponsorship ? ' · Visa sponsorship' : ''}
            </span>
          )}
        </div>
      </div>

      {scanning && (
        <div style={{ textAlign: 'center', padding: '64px 24px' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 18px' }}></div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Scanning {regionLabel}...</div>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>Searching UAE job boards via Google.</p>
        </div>
      )}

      {/* Hidden search container for Google CSE */}
      <div ref={searchRootRef} style={{ display: 'none' }}></div>

      {scanResults.length > 0 && !scanning && (
        <div className="card">
          <div style={{ padding: '16px 20px 13px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              Results ({scanResults.length})
            </span>
          </div>
          {scanResults.map(r => (
            <div key={r.id} className="scan-row">
              <div>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: scoreLevel(r.score) === 'high' ? 'var(--success)' : scoreLevel(r.score) === 'mid' ? 'var(--warning)' : 'var(--error)' }}></div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{r.title}</span>
                  {r.visaSponsorship && (
                    <span style={{ fontSize: 9.5, fontWeight: 600, padding: '1px 5px', borderRadius: 4, background: '#22c55e20', color: '#22c55e', letterSpacing: 0.3 }}>
                      VISA
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{r.company} · {r.location}</div>
              </div>
              <span className="score-badge" data-level={scoreLevel(r.score)} style={{ flexShrink: 0, marginRight: 4 }}>{r.score}</span>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {r.url ? (
                  <a href={r.url} target="_blank" className="btn btn-primary btn-xs" rel="noreferrer">View</a>
                ) : (
                  <span className="btn btn-ghost btn-xs" style={{ opacity: 0.5, cursor: 'default' }}>No URL</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
