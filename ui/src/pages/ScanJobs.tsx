import { useState, useEffect } from 'react'
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

const VISA_KEYWORDS = ['visa sponsorship', 'sponsor', 'work visa', 'employment visa', 'visa provided', 'relocation package', 'relocation assistance', 'relocate', 'overseas', 'international', 'expat', 'work permit']

const UAE_COMPANIES = ['emirates', 'etihad', 'adnoc', 'dp world', 'emaar', 'fab', 'first abu dhabi', 'careem', 'talabat', 'majid al futtaim', 'damac', 'aldar', 'mubadala', 'etisalat', 'du', 'masdar', 'noor bank', 'unilever', 'pwc', 'deloitte', 'kpmg', 'ey', 'accenture', 'citi', 'hsbc', 'standard chartered', 'amazon', 'google', 'microsoft', 'oracle', 'ibm']

export default function ScanJobs() {
  const { showToast, portals, profile } = useApp()
  const [scanning, setScanning] = useState(false)
  const [region, setRegion] = useState('all')
  const [visaSponsorship, setVisaSponsorship] = useState(true)
  const [scanResults, setScanResults] = useState<any[]>([])
  const [scriptLoaded, setScriptLoaded] = useState(false)

  const regionLabel = REGIONS.find(r => r.value === region)?.label || 'All UAE'
  const locationTerm = region === 'remote' ? 'Remote' : regionLabel

  useEffect(() => {
    if (document.querySelector('script[src*="cse.google.com/cse.js"]')) {
      setScriptLoaded(true)
      return
    }
    const s = document.createElement('script')
    s.src = `https://cse.google.com/cse.js?cx=${CX}`
    s.onload = () => setScriptLoaded(true)
    document.head.appendChild(s)
  }, [])

  // Fetch results via Google Custom Search REST API directly from browser
  const searchViaREST = async (query: string): Promise<any> => {
    const res = await fetch(`https://www.googleapis.com/customsearch/v1?key=AIzaSyALz7g-iF4Ry5HUaVk3WlS6fqbna0EEdFA&cx=${CX}&q=${encodeURIComponent(query)}&num=10`)
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Google API (${res.status}): ${text.slice(0, 300)}`)
    }
    return await res.json()
  }

  const parseResults = (data: any): any[] => {
    const out: any[] = []
    // JSON REST API format
    const items = data?.items || data?.results || []
    if (!items.length) return out

    const negKws = portals?.negativeKeywords || ['Senior', 'Lead', 'Manager']

    for (const item of items) {
      const title = item.title || ''
      const url = item.link || item.unescapedUrl || item.url || ''
      const snippet = item.snippet || item.content || item.contentNoFormatting || ''
      const lower = title.toLowerCase()
      if (negKws.some((k: string) => lower.includes(k.toLowerCase()))) continue

      const company = (title.match(/\bat\s+([^-]+)/i) || title.match(/-\s*(.+)$/))?.[1]?.trim()
        || snippet.match(/(?:at|by|with)\s+([A-Z][A-Za-z0-9\s&.]+?)(?:\s+-\s+|\s+in\s+|\.|$)/)?.[1]?.trim()
        || 'UAE Company'

      const key = `${company}|${title}`
      if (out.some(r => (r as any).key === key)) continue

      const hasVisa = VISA_KEYWORDS.some(kw => (title + ' ' + snippet).toLowerCase().includes(kw))
      if (visaSponsorship && !hasVisa) continue

      out.push({ key, id: Date.now() + Math.random(), title, company, location: regionLabel, url, source: url.includes('indeed.com') ? 'Indeed' : url.includes('gulftalent.com') ? 'Gulftalent' : url.includes('naukrigulf.com') ? 'Naukri Gulf' : url.includes('bayt.com') ? 'Bayt' : url.includes('monstergulf.com') ? 'Monster Gulf' : 'Job Board', visaSponsorship: hasVisa, snippet } as any)
    }
    return out
  }

  const scoreJob = (title: string, company: string, hasVisa: boolean): number => {
    let s = 50
    const l = title.toLowerCase()
    const pk = portals?.positiveKeywords || ['Data Analyst', 'IT Specialist']
    for (const k of pk) { if (l.includes(k.toLowerCase())) s += 8 }
    if (region === 'all' || region === 'dubai' || region === 'abu-dhabi' || region === 'sharjah') s += 10
    if (region === 'remote' && (l.includes('remote') || l.includes('wfh'))) s += 15
    if (hasVisa) s += 12
    for (const c of UAE_COMPANIES) { if (company.toLowerCase().includes(c)) s += 5 }
    const tr = (profile?.targetRoles || '').toLowerCase()
    if (tr && l.includes(tr)) s += 12
    return Math.min(Math.round(s), 100)
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
    let errors: string[] = []

    for (const role of roles) {
      const query = `${role} ${locationTerm} site:${SEARCH_SITES}`

      try {
        const data = await searchViaREST(query)
        const parsed = parseResults(data)
        for (const r of parsed) {
          if (seen.has(r.key)) continue
          seen.add(r.key)
          r.score = scoreJob(r.title, r.company, r.visaSponsorship)
          delete r.key
          allResults.push(r)
        }
      } catch (e: any) {
        errors.push(`${role}: ${e.message || e}`)
      }
    }

    if (allResults.length === 0) {
      showToast(errors.length ? `Google error: ${errors[0]}` : 'No matching jobs found')
      console.error('Scan errors:', errors)
      setScanning(false)
      return
    }

    // DeepSeek scoring
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portals, profile, region, visaSponsorship, clientJobs: allResults.map(r => ({ id: r.id, title: r.title, company: r.company, location: r.location })) }),
      })
      const d = await res.json()
      if (d.jobs) {
        const sm = new Map(d.jobs.map((j: any) => [j.id, j.score]))
        const vm = new Map(d.jobs.map((j: any) => [j.id, j.visaSponsorship]))
        for (const r of allResults) { if (sm.has(r.id)) r.score = sm.get(r.id); if (vm.has(r.id)) r.visaSponsorship = vm.get(r.id) }
      }
    } catch {}

    allResults.sort((a, b) => b.score - a.score)
    setScanResults(allResults.slice(0, 30))
    showToast(`${Math.min(allResults.length, 30)} jobs found`)
    setScanning(false)
  }

  const sl = (s: number) => s >= 85 ? 'high' : s >= 65 ? 'mid' : 'low'

  return (
    <div className="view-wrap" style={{ padding: '36px 40px', maxWidth: 860 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5, margin: '0 0 5px' }}>Scan Jobs</h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>Search UAE job boards via Google with DeepSeek AI scoring.</p>
      </div>

      <div className="card" style={{ padding: '20px 22px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 5, color: 'var(--text-faint)' }}>Region</label>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {REGIONS.map(r => (
                <button key={r.value} onClick={() => setRegion(r.value)}
                  className={`btn btn-xs ${region === r.value ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: 11.5 }}>{r.label}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 5, color: 'var(--text-faint)' }}>Filters</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)', userSelect: 'none' }}>
              <input type="checkbox" checked={visaSponsorship}
                onChange={e => setVisaSponsorship(e.target.checked)}
                style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
              Visa Sponsorship required
            </label>
          </div>
        </div>
        <button className="btn btn-primary" onClick={triggerScan} disabled={scanning}
          style={{ opacity: scanning ? 0.6 : 1, cursor: scanning ? 'default' : 'pointer' }}>
          {scanning ? 'Scanning...' : (scanResults.length > 0 ? 'Scan Again' : 'Start Scan')}
        </button>
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
              <div><div style={{ width: 8, height: 8, borderRadius: '50%', background: sl(r.score) === 'high' ? 'var(--success)' : sl(r.score) === 'mid' ? 'var(--warning)' : 'var(--error)' }}></div></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{r.title}</span>
                  {r.visaSponsorship && <span style={{ fontSize: 9.5, fontWeight: 600, padding: '1px 5px', borderRadius: 4, background: '#22c55e20', color: '#22c55e', letterSpacing: 0.3 }}>VISA</span>}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{r.company} · {r.location}</div>
              </div>
              <span className="score-badge" data-level={sl(r.score)} style={{ flexShrink: 0, marginRight: 4 }}>{r.score}</span>
              {r.url ? <a href={r.url} target="_blank" className="btn btn-primary btn-xs" rel="noreferrer">View</a>
                : <span className="btn btn-ghost btn-xs" style={{ opacity: 0.5, cursor: 'default' }}>No URL</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
