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

const VISA_KEYWORDS = ['visa sponsorship', 'sponsor', 'work visa', 'employment visa', 'visa provided', 'relocation package', 'relocation assistance', 'relocate', 'overseas', 'international', 'expat', 'work permit']

const UAE_COMPANIES = ['emirates', 'etihad', 'adnoc', 'dp world', 'emaar', 'fab', 'first abu dhabi', 'careem', 'talabat', 'majid al futtaim', 'damac', 'aldar', 'mubadala', 'etisalat', 'du', 'masdar', 'noor bank', 'unilever', 'pwc', 'deloitte', 'kpmg', 'ey', 'accenture', 'citi', 'hsbc', 'standard chartered', 'amazon', 'google', 'microsoft', 'oracle', 'ibm']

export default function ScanJobs() {
  const { showToast, profile } = useApp()
  const [scanning, setScanning] = useState(false)
  const [region, setRegion] = useState('all')
  const [visaSponsorship, setVisaSponsorship] = useState(true)
  const [scanResults, setScanResults] = useState<any[]>([])
  const [manualInput, setManualInput] = useState('')
  const [method, setMethod] = useState<'auto' | 'manual'>('auto')

  const regionLabel = REGIONS.find(r => r.value === region)?.label || 'All UAE'

  const scoreJob = (title: string, company: string, hasVisa: boolean): number => {
    let s = 50
    const l = title.toLowerCase()
    if (l.includes('data analyst') || l.includes('it specialist') || l.includes('bi analyst')) s += 8
    if (region === 'all' || region === 'dubai' || region === 'abu-dhabi' || region === 'sharjah') s += 10
    if (hasVisa) s += 12
    for (const c of UAE_COMPANIES) { if (company.toLowerCase().includes(c)) s += 5 }
    const tr = (profile?.targetRoles || '').toLowerCase()
    if (tr && l.includes(tr)) s += 12
    return Math.min(Math.round(s), 100)
  }

  const parseGoogleResults = (data: any): any[] => {
    const out: any[] = []
    const items = data?.results || []
    if (!items.length) return out
    for (const item of items) {
      const title = item.title || ''
      const url = item.clickUrl || item.url || ''
      const snippet = item.content || ''
      const lower = title.toLowerCase()
      if (['senior', 'lead', 'manager', 'principal'].some(k => lower.includes(k))) continue
      const company = item.richSnippet?.organization?.name
        || (title.match(/\bat\s+([^-]+)/i) || title.match(/-\s*(.+)$/))?.[1]?.trim()
        || snippet.match(/(?:at|by|with)\s+([A-Z][A-Za-z0-9\s&.]+?)(?:\s+-\s+|\s+in\s+|\.|$)/)?.[1]?.trim()
        || 'UAE Company'
      const hasVisa = VISA_KEYWORDS.some(kw => (title + ' ' + snippet).toLowerCase().includes(kw))
      if (visaSponsorship && !hasVisa) continue
      const key = `${company}|${title}`
      if (out.some(r => (r as any).key === key)) continue
      out.push({ key, id: Date.now() + Math.random(), title, company, location: regionLabel, url, source: 'Google CSE', visaSponsorship: hasVisa, snippet } as any)
    }
    return out
  }

  const searchCSE = (query: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const cb = '_cse_cb_' + Date.now()
      const url = `https://cse.google.com/cse/element/v1?rsz=filtered_cse&num=10&hl=en&source=gcsc&cx=${CX}&q=${encodeURIComponent(query)}&callback=${cb}`

      ;(window as any)[cb] = (data: any) => {
        delete (window as any)[cb]
        resolve(data)
      }

      const t = document.createElement('script')
      t.src = url
      t.onerror = () => { delete (window as any)[cb]; reject(new Error('Script failed to load')) }
      document.head.appendChild(t)
      setTimeout(() => { delete (window as any)[cb]; reject(new Error('Request timed out')) }, 20000)
    })
  }

  const triggerAutoScan = async () => {
    if (scanning) return
    setScanning(true)
    setScanResults([])

    const roles = profile?.targetRoles
      ? profile.targetRoles.split(',').map((r: string) => r.trim()).filter(Boolean)
      : ['Data Analyst', 'IT Specialist', 'BI Analyst']

    const queries = roles.map(r => `${r} ${regionLabel}`)
    const allResults: any[] = []
    const seen = new Set<string>()
    let errors: string[] = []

    for (const q of queries) {
      try {
        const data = await searchCSE(q)
        const parsed = parseGoogleResults(data)
        for (const r of parsed) {
          if (seen.has(r.key)) continue
          seen.add(r.key)
          r.score = scoreJob(r.title, r.company, r.visaSponsorship)
          delete r.key
          allResults.push(r)
        }
      } catch (e: any) {
        errors.push(`${q}: ${e.message || e}`)
      }
    }

    if (allResults.length === 0) {
      showToast(errors.length ? `Search blocked by Google. Try Manual Input below.` : 'No results')
      setScanning(false)
      return
    }

    // DeepSeek scoring
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientJobs: allResults.map(r => ({ id: r.id, title: r.title, company: r.company, location: r.location })) }),
      })
      const d = await res.json()
      if (d.jobs) {
        const sm = new Map(d.jobs.map((j: any) => [j.id, j.score]))
        for (const r of allResults) { if (sm.has(r.id)) r.score = sm.get(r.id) }
      }
    } catch {}

    allResults.sort((a, b) => b.score - a.score)
    setScanResults(allResults.slice(0, 30))
    showToast(`${Math.min(allResults.length, 30)} jobs found`)
    setScanning(false)
  }

  const triggerManualScan = async () => {
    if (scanning || !manualInput.trim()) return
    setScanning(true)
    setScanResults([])

    const lines = manualInput.split('\n').map(l => l.trim()).filter(Boolean)

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientJobs: lines.map((l, i) => ({ id: Date.now() + i, text: l })) }),
      })
      const d = await res.json()
      if (d.jobs) {
        const results = d.jobs.map((j: any, i: number) => ({
          id: Date.now() + i,
          title: j.title || lines[i]?.slice(0, 80) || 'Job ' + (i + 1),
          company: j.company || 'Unknown',
          location: regionLabel,
          url: j.url || '',
          source: 'Manual',
          visaSponsorship: j.visaSponsorship !== false,
          score: j.score || 50,
          snippet: j.snippet || '',
        }))
        results.sort((a: any, b: any) => b.score - a.score)
        setScanResults(results)
        showToast(`${results.length} jobs analyzed`)
      }
    } catch (e: any) {
      showToast(`DeepSeek scoring failed: ${e.message}`)
    }
    setScanning(false)
  }

  const triggerScan = () => {
    if (method === 'auto') triggerAutoScan()
    else triggerManualScan()
  }

  const sl = (s: number) => s >= 85 ? 'high' : s >= 65 ? 'mid' : 'low'

  return (
    <div className="view-wrap" style={{ padding: '36px 40px', maxWidth: 860 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5, margin: '0 0 5px' }}>Scan Jobs</h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>Auto-search via Google CSE or paste job URLs for DeepSeek AI scoring.</p>
      </div>

      <div className="card" style={{ padding: '20px 22px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className={`btn btn-xs ${method === 'auto' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMethod('auto')}>Auto Search</button>
          <button className={`btn btn-xs ${method === 'manual' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMethod('manual')}>Manual Paste</button>
        </div>

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

        {method === 'manual' && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 6, color: 'var(--text-faint)' }}>
              Paste job URLs or descriptions (one per line)
            </label>
            <textarea value={manualInput} onChange={e => setManualInput(e.target.value)}
              placeholder={`Data Analyst at Emirates Group - Dubai\nhttps://ae.indeed.com/viewjob?jk=123\nIT Support Specialist at DP World - Abu Dhabi`}
              style={{ width: '100%', minHeight: 100, padding: 10, fontSize: 13, fontFamily: 'inherit', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text)', resize: 'vertical' }} />
          </div>
        )}

        <button className="btn btn-primary" onClick={triggerScan} disabled={scanning || (method === 'manual' && !manualInput.trim())}
          style={{ opacity: scanning ? 0.6 : 1, cursor: scanning ? 'default' : 'pointer' }}>
          {scanning ? 'Processing...'
            : method === 'auto' ? (scanResults.length > 0 ? 'Scan Again' : 'Start Scan')
            : 'Analyze Jobs'}
        </button>
      </div>

      {scanning && (
        <div style={{ textAlign: 'center', padding: '64px 24px' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 18px' }}></div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
            {method === 'auto' ? `Scanning ${regionLabel}...` : 'Analyzing with DeepSeek AI...'}
          </div>
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
