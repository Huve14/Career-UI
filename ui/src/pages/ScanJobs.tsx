import { useState } from 'react'
import { useApp } from '../lib/context'

const REGIONS = [
  { value: 'all', label: 'All UAE' },
  { value: 'dubai', label: 'Dubai' },
  { value: 'abu-dhabi', label: 'Abu Dhabi' },
  { value: 'sharjah', label: 'Sharjah' },
  { value: 'remote', label: 'Remote / WFH' },
]

const CX = '567fa2be6325d416e'
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

export default function ScanJobs() {
  const { showToast, portals, profile } = useApp()
  const [scanning, setScanning] = useState(false)
  const [region, setRegion] = useState('all')
  const [visaSponsorship, setVisaSponsorship] = useState(true)
  const [scanResults, setScanResults] = useState<any[]>([])

  const regionLabel = REGIONS.find(r => r.value === region)?.label || 'All UAE'
  const locationTerm = region === 'remote' ? 'Remote' : regionLabel

  // Google CSE Element JSONP endpoint — no API key needed
  const searchViaElementAPI = (query: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const callbackName = '_cse_cb_' + Date.now()
      const url = `https://cse.google.com/cse/element/v1?rsz=filtered_cse&num=10&hl=en&source=gcsc&cx=${CX}&q=${encodeURIComponent(query)}&callback=${callbackName}`

      ;(window as any)[callbackName] = (data: any) => {
        delete (window as any)[callbackName]
        resolve(data)
      }

      const script = document.createElement('script')
      script.src = url
      script.onerror = () => {
        delete (window as any)[callbackName]
        reject(new Error('JSONP load failed'))
      }
      document.head.appendChild(script)

      setTimeout(() => {
        delete (window as any)[callbackName]
        reject(new Error('timeout'))
      }, 10000)
    })
  }

  const parseResults = (data: any): any[] => {
    const results: any[] = []
    if (!data?.results) return results

    const negKws = portals?.negativeKeywords || ['Senior', 'Lead', 'Manager']

    for (const item of data.results) {
      const title = item.title || ''
      const url = item.unescapedUrl || item.url || ''
      const snippet = item.content || item.contentNoFormatting || ''

      const lower = title.toLowerCase()
      if (negKws.some((k: string) => lower.includes(k.toLowerCase()))) continue

      const company = extractCompany(title, snippet)
      const key = `${company}|${title}`
      if (results.some(r => r.key === key)) continue

      const allText = `${title} ${snippet}`.toLowerCase()
      const hasVisa = VISA_KEYWORDS.some(kw => allText.includes(kw))
      if (visaSponsorship && !hasVisa) continue

      results.push({
        key,
        id: Date.now() + Math.random(),
        title,
        company,
        location: regionLabel,
        url,
        source: extractSource(url),
        visaSponsorship: hasVisa,
        snippet,
      })
    }
    return results
  }

  const scoreJob = (title: string, company: string, hasVisa: boolean): number => {
    let score = 50
    const lower = title.toLowerCase()
    const posKws = portals?.positiveKeywords || ['Data Analyst', 'IT Specialist']
    for (const kw of posKws) { if (lower.includes(kw.toLowerCase())) score += 8 }

    if (region === 'all' || region === 'dubai' || region === 'abu-dhabi' || region === 'sharjah') score += 10
    if (region === 'remote' && (lower.includes('remote') || lower.includes('wfh'))) score += 15
    if (hasVisa) score += 12
    const cLower = company.toLowerCase()
    for (const c of UAE_COMPANIES) { if (cLower.includes(c)) score += 5 }
    const tr = (profile?.targetRoles || '').toLowerCase()
    if (tr && lower.includes(tr)) score += 12
    return Math.min(Math.round(score), 100)
  }

  const extractCompany = (title: string, snippet: string): string => {
    const m = title.match(/\bat\s+([^-]+)/i) || title.match(/-\s*(.+)$/)
    if (m) return m[1].trim()
    const sm = snippet.match(/(?:at|by|with)\s+([A-Z][A-Za-z0-9\s&.]+?)(?:\s+-\s+|\s+in\s+|\.|$)/)
    return sm ? sm[1].trim() : 'UAE Company'
  }

  const extractSource = (url: string): string => {
    if (url.includes('indeed.com')) return 'Indeed'
    if (url.includes('gulftalent.com')) return 'Gulftalent'
    if (url.includes('naukrigulf.com')) return 'Naukri Gulf'
    if (url.includes('bayt.com')) return 'Bayt'
    if (url.includes('monstergulf.com')) return 'Monster Gulf'
    return 'Job Board'
  }

  const triggerScan = async () => {
    if (scanning) return
    setScanning(true)
    setScanResults([])

    const roles = profile?.targetRoles
      ? profile.targetRoles.split(',').map((r: string) => r.trim()).filter(Boolean)
      : ['Data Analyst', 'IT Specialist', 'BI Analyst']

    const allResults: any[] = []
    const seen = new Set<string>()

    for (const role of roles) {
      try {
        const query = `${role} ${locationTerm} site:${SEARCH_SITES}`
        const data = await searchViaElementAPI(query)
        const parsed = parseResults(data)

        for (const r of parsed) {
          if (seen.has(r.key)) continue
          seen.add(r.key)
          r.score = scoreJob(r.title, r.company, r.visaSponsorship)
          delete r.key
          allResults.push(r)
        }
      } catch {
        // skip failed queries
      }
    }

    if (allResults.length === 0) {
      showToast('No matching jobs found')
      setScanning(false)
      return
    }

    // Submit to backend for DeepSeek scoring
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portals, profile, region, visaSponsorship,
          clientJobs: allResults.map(r => ({ id: r.id, title: r.title, company: r.company, location: r.location })),
        }),
      })
      const data = await res.json()
      if (data.jobs) {
        const scoreMap = new Map(data.jobs.map((j: any) => [j.id, j.score]))
        const visaMap = new Map(data.jobs.map((j: any) => [j.id, j.visaSponsorship]))
        for (const r of allResults) {
          if (scoreMap.has(r.id)) r.score = scoreMap.get(r.id)
          if (visaMap.has(r.id)) r.visaSponsorship = visaMap.get(r.id)
        }
      }
    } catch { /* use client-side scores */ }

    allResults.sort((a, b) => b.score - a.score)
    setScanResults(allResults.slice(0, 30))
    showToast(`${Math.min(allResults.length, 30)} jobs found`)
    setScanning(false)
  }

  const scoreLevel = (s: number) => s >= 85 ? 'high' : s >= 65 ? 'mid' : 'low'

  return (
    <div className="view-wrap" style={{ padding: '36px 40px', maxWidth: 860 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5, margin: '0 0 5px' }}>Scan Jobs</h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>
          Search UAE job boards with Google + DeepSeek AI matching.
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
                <button key={r.value} onClick={() => setRegion(r.value)}
                  className={`btn btn-xs ${region === r.value ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: 11.5 }}>{r.label}</button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Filters</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)', userSelect: 'none' }}>
              <input type="checkbox" checked={visaSponsorship}
                onChange={e => setVisaSponsorship(e.target.checked)}
                style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
              Visa Sponsorship required
            </label>
          </div>
        </div>

        <div className="btn btn-primary" onClick={triggerScan}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, opacity: scanning ? 0.6 : 1, cursor: scanning ? 'default' : 'pointer' }}>
          {scanning ? (
            <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.75s linear infinite', flexShrink: 0 }}></div><span>Scanning...</span></>
          ) : (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <span>{scanResults.length > 0 ? 'Scan Again' : 'Start Scan'}</span></>
          )}
        </div>
      </div>

      {scanning && (
        <div style={{ textAlign: 'center', padding: '64px 24px' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 18px' }}></div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Scanning {regionLabel}...</div>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>Searching Indeed, Gulftalent, Naukri Gulf, Bayt, Monster Gulf.</p>
        </div>
      )}

      {scanResults.length > 0 && !scanning && (
        <div className="card">
          <div style={{ padding: '16px 20px 13px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Results ({scanResults.length})</span>
          </div>
          {scanResults.map(r => (
            <div key={r.id} className="scan-row">
              <div><div style={{ width: 8, height: 8, borderRadius: '50%', background: scoreLevel(r.score) === 'high' ? 'var(--success)' : scoreLevel(r.score) === 'mid' ? 'var(--warning)' : 'var(--error)' }}></div></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{r.title}</span>
                  {r.visaSponsorship && <span style={{ fontSize: 9.5, fontWeight: 600, padding: '1px 5px', borderRadius: 4, background: '#22c55e20', color: '#22c55e', letterSpacing: 0.3 }}>VISA</span>}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{r.company} · {r.location}</div>
              </div>
              <span className="score-badge" data-level={scoreLevel(r.score)} style={{ flexShrink: 0, marginRight: 4 }}>{r.score}</span>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {r.url ? <a href={r.url} target="_blank" className="btn btn-primary btn-xs" rel="noreferrer">View</a>
                  : <span className="btn btn-ghost btn-xs" style={{ opacity: 0.5, cursor: 'default' }}>No URL</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
