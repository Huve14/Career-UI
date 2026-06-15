import { useState, useEffect, useRef } from 'react'
import { useApp } from '../lib/context'

// ── Auto Scan ─────────────────────────────────────────────────

const REGIONS = [
  { value: 'all', label: 'All UAE' },
  { value: 'dubai', label: 'Dubai' },
  { value: 'abu-dhabi', label: 'Abu Dhabi' },
  { value: 'sharjah', label: 'Sharjah' },
  { value: 'remote', label: 'Remote / WFH' },
]

interface LiveJob {
  id: number
  title: string
  company: string
  location: string
  url: string
  score?: number
}

export default function ScanJobs() {
  const { showToast, pipeline, setPipeline, profile } = useApp()
  const [scanning, setScanning] = useState(false)
  const [region, setRegion] = useState('all')
  const [visaOnly, setVisaOnly] = useState(false)
  const [results, setResults] = useState<LiveJob[]>([])
  const [manualInput, setManualInput] = useState('')
  const [method, setMethod] = useState<'auto' | 'manual'>('auto')
  const [scanInfo, setScanInfo] = useState<{ scanned: number; ts: string } | null>(null)

  const regionLabel = REGIONS.find(r => r.value === region)?.label || 'All UAE'

  const triggerAutoScan = async () => {
    if (scanning) return
    setScanning(true)
    setResults([])
    setScanInfo(null)
    try {
      const res = await fetch(`/api/scan-live?t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()

      let jobs: LiveJob[] = (data.jobs || []).map((j: any, i: number) => ({ ...j, id: i + 1 }))

      if (region !== 'all') {
        jobs = jobs.filter(j => {
          const loc = j.location.toLowerCase()
          if (region === 'remote') return loc.includes('remote') || loc.includes('wfh') || !loc
          return loc.includes(regionLabel.toLowerCase()) || !loc
        })
      }
      if (visaOnly) {
        jobs = jobs.filter(j => /sponsor|visa|relocation|expat/i.test(j.title + ' ' + j.location))
      }

      setResults(jobs)
      setScanInfo({ scanned: data.scanned || 0, ts: data.ts || '' })
      showToast(`${jobs.length} jobs found across ${data.scanned} companies`)
    } catch (e: any) {
      showToast(`Scan failed: ${e.message}`)
    }
    setScanning(false)
  }

  const triggerManualScan = async () => {
    if (scanning || !manualInput.trim()) return
    setScanning(true)
    setResults([])
    const lines = manualInput.split('\n').map(l => l.trim()).filter(Boolean)
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientJobs: lines.map((l, i) => ({ id: i + 1, text: l })) }),
      })
      const d = await res.json()
      if (d.jobs) {
        const parsed: LiveJob[] = d.jobs.map((j: any, i: number) => ({
          id: i + 1,
          title: j.title || lines[i]?.slice(0, 80) || `Job ${i + 1}`,
          company: j.company || 'Unknown',
          location: j.location || '',
          url: j.url || '',
          score: j.score,
        }))
        parsed.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        setResults(parsed)
        showToast(`${parsed.length} jobs analyzed`)
      }
    } catch (e: any) {
      showToast(`Analysis failed: ${e.message}`)
    }
    setScanning(false)
  }

  const addToPipeline = async (job: LiveJob) => {
    if (pipeline.some(p => p.url === job.url)) { showToast('Already in pipeline'); return }
    await setPipeline([
      ...pipeline,
      { id: Date.now(), url: job.url, added: new Date().toISOString().slice(0, 10), company: job.company, role: job.title },
    ])
    showToast(`${job.company} added to pipeline`)
  }

  const scoreColor = (s?: number) =>
    !s ? 'var(--text-faint)' : s >= 80 ? '#22c55e' : s >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="view-wrap" style={{ padding: '36px 40px', maxWidth: 900 }}>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5, margin: '0 0 5px' }}>
          Scan Jobs
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>
          Live scan of 29 company ATS boards filtered to your CV.
          {profile?.targetRoles && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>{profile.targetRoles}</span>}
        </p>
      </div>

      <div className="card" style={{ padding: '20px 22px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className={`btn btn-xs ${method === 'auto' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMethod('auto')}>Auto Scan</button>
          <button className={`btn btn-xs ${method === 'manual' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMethod('manual')}>Manual Paste</button>
        </div>

        {method === 'auto' && (
          <>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
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
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 5, color: 'var(--text-faint)' }}>Filters</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)', userSelect: 'none' }}>
                  <input type="checkbox" checked={visaOnly} onChange={e => setVisaOnly(e.target.checked)}
                    style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
                  Visa / sponsorship mentions only
                </label>
              </div>
            </div>
            <button className="btn btn-primary" onClick={triggerAutoScan} disabled={scanning}
              style={{ opacity: scanning ? 0.6 : 1, cursor: scanning ? 'default' : 'pointer' }}>
              {scanning ? 'Scanning…' : results.length > 0 ? 'Scan Again' : 'Start Scan'}
            </button>
          </>
        )}

        {method === 'manual' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 6, color: 'var(--text-faint)' }}>
                Paste job URLs or descriptions (one per line)
              </label>
              <textarea value={manualInput} onChange={e => setManualInput(e.target.value)}
                placeholder={`Data Analyst at Emirates Group - Dubai\nhttps://ae.indeed.com/viewjob?jk=123`}
                style={{ width: '100%', minHeight: 100, padding: 10, fontSize: 13, fontFamily: 'inherit', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text)', resize: 'vertical' }} />
            </div>
            <button className="btn btn-primary" onClick={triggerManualScan}
              disabled={scanning || !manualInput.trim()} style={{ opacity: scanning ? 0.6 : 1 }}>
              {scanning ? 'Analyzing…' : 'Analyze Jobs'}
            </button>
          </>
        )}
      </div>

      {scanning && (
        <div style={{ textAlign: 'center', padding: '64px 24px' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 18px' }} />
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
            {method === 'auto' ? 'Hitting ATS APIs across 29 companies…' : 'Analyzing with DeepSeek AI…'}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>
            {method === 'auto' ? 'Greenhouse · Ashby · Lever — no tokens used' : 'Extracting job details from your input'}
          </div>
        </div>
      )}

      {results.length > 0 && !scanning && (
        <div className="card" style={{ marginBottom: 40 }}>
          <div style={{ padding: '14px 20px 13px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              {results.length} matching jobs
            </span>
            {scanInfo && (
              <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                {scanInfo.scanned} companies · {new Date(scanInfo.ts).toLocaleTimeString()}
              </span>
            )}
          </div>
          {results.map(job => (
            <div key={job.id} className="scan-row" style={{ alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: job.score ? scoreColor(job.score) : 'var(--accent)', marginTop: 6, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {job.title}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  {job.company}{job.location ? ` · ${job.location}` : ''}
                </div>
                <a href={job.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: 'var(--text-faint)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                  {job.url.replace(/^https?:\/\//, '')}
                </a>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginTop: 2 }}>
                {job.score && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(job.score) }}>
                    {Math.round(job.score / 20 * 10) / 10}/5
                  </span>
                )}
                {job.url && (
                  <a href={job.url} target="_blank" rel="noopener noreferrer"
                    className="btn btn-xs"
                    style={{ background: '#22c55e', color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                    Apply ↗
                  </a>
                )}
                <button className="btn btn-primary btn-xs" onClick={() => addToPipeline(job)}>
                  + Pipeline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Custom Search Engine — fully isolated below ──────────── */}
      <GoogleCseSection />
    </div>
  )
}

// ── Custom Search Engine (self-contained, loads CSE lazily) ───

const CSE_ID = '61294f5963fcd4a85'

const UAE_SEARCH_REGIONS = [
  { value: 'all',            label: 'All UAE',         query: 'UAE' },
  { value: 'dubai',          label: 'Dubai',           query: 'Dubai' },
  { value: 'abu-dhabi',      label: 'Abu Dhabi',       query: 'Abu Dhabi' },
  { value: 'sharjah',        label: 'Sharjah',         query: 'Sharjah' },
  { value: 'ajman',          label: 'Ajman',           query: 'Ajman' },
  { value: 'ras-al-khaimah', label: 'Ras Al Khaimah', query: 'Ras Al Khaimah' },
  { value: 'fujairah',       label: 'Fujairah',        query: 'Fujairah' },
  { value: 'umm-al-quwain',  label: 'Umm Al Quwain',  query: 'Umm Al Quwain' },
  { value: 'remote',         label: 'Remote / WFH',   query: 'remote UAE' },
  { value: 'mena',           label: 'MENA',            query: 'Middle East' },
]

function GoogleCseSection() {
  const [cseLoaded, setCseLoaded] = useState(false)
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('all')
  const inputRef = useRef<HTMLInputElement>(null)

  const loadCse = () => {
    if (cseLoaded || document.querySelector(`script[src*="${CSE_ID}"]`)) {
      setCseLoaded(true)
      return
    }
    ;(window as any).__gcse = { parsetags: 'auto' }
    const s = document.createElement('script')
    s.async = true
    s.src = `https://cse.google.com/cse.js?cx=${CSE_ID}`
    s.onload = () => setCseLoaded(true)
    document.head.appendChild(s)
  }

  const search = (q = query, r = region) => {
    const trimmed = q.trim()
    if (!trimmed) { inputRef.current?.focus(); return }

    if (!cseLoaded) { loadCse() }

    const regionObj = UAE_SEARCH_REGIONS.find(x => x.value === r) || UAE_SEARCH_REGIONS[0]
    const fullQuery = `${trimmed} ${regionObj.query} jobs`

    const run = () => {
      try {
        const w = window as any
        if (w.google?.search?.cse?.element) {
          const els = w.google.search.cse.element.getAllElements()
          const keys = Object.keys(els)
          if (keys.length > 0) { els[keys[0]].clearAllResults(); els[keys[0]].execute(fullQuery); return }
        }
      } catch { /* fall through */ }
      const inp = document.querySelector('.cse-wrap input.gsc-input') as HTMLInputElement | null
      const btn = document.querySelector('.cse-wrap button.gsc-search-button-v2, .cse-wrap button.gsc-search-button') as HTMLElement | null
      if (inp && btn) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
        if (setter) setter.call(inp, fullQuery); else inp.value = fullQuery
        inp.dispatchEvent(new Event('input', { bubbles: true }))
        btn.click()
      }
    }

    // If CSE just loaded, wait a tick for it to initialise
    if (!cseLoaded) setTimeout(run, 1200); else run()
  }

  const handleRegionChange = (r: string) => {
    setRegion(r)
    if (query.trim()) search(query, r)
  }

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.3, margin: '0 0 4px' }}>
          Custom Search Engine
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Search across UAE job boards via your Google Custom Search Engine.
        </p>
      </div>

      <div className="card" style={{ padding: '20px 22px', marginBottom: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 6, color: 'var(--text-faint)' }}>Region</label>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {UAE_SEARCH_REGIONS.map(r => (
              <button key={r.value}
                className={`btn btn-xs ${region === r.value ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handleRegionChange(r.value)}
                style={{ fontSize: 11.5 }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            className="form-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder={`e.g. "Data Analyst" or "IT Specialist" — ${UAE_SEARCH_REGIONS.find(r => r.value === region)?.label || 'All UAE'}`}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={() => search()} style={{ flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Search
          </button>
        </div>
      </div>

      <div className="cse-wrap">
        <div className="gcse-searchresults-only"></div>
      </div>
    </div>
  )
}
