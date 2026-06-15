import { useState } from 'react'
import { useApp } from '../lib/context'

const GITHUB_RAW = 'https://raw.githubusercontent.com/Huve14/Career-UI/main'

const REGIONS = [
  { value: 'all', label: 'All UAE' },
  { value: 'dubai', label: 'Dubai' },
  { value: 'abu-dhabi', label: 'Abu Dhabi' },
  { value: 'sharjah', label: 'Sharjah' },
  { value: 'remote', label: 'Remote / WFH' },
]

type Status = 'pending' | 'evaluated' | 'discarded'

interface ScanResult {
  id: number
  url: string
  company: string
  role: string
  score: number | null
  status: Status
  note: string
  visaSponsorship: boolean
}

function parsePipelineMd(md: string): ScanResult[] {
  const results: ScanResult[] = []
  let id = 1
  for (const line of md.split('\n')) {
    const t = line.trim()
    let status: Status | null = null
    if (t.startsWith('- [ ]') && t.includes('http')) status = 'pending'
    else if (t.startsWith('- [x]') && t.includes('http')) status = 'evaluated'
    else if (t.startsWith('- [!]') && t.includes('http')) status = 'discarded'
    if (!status) continue

    const urlMatch = t.match(/https?:\/\/[^\s|]+/)
    if (!urlMatch) continue
    const url = urlMatch[0]

    const parts = t.split('|').map(p => p.trim())
    const company = parts[1] || ''
    const role = (parts[2] || '').replace(/\s*\*\*[\d.]+\/5\*\*.*$/, '').trim()
    const rest = parts.slice(3).join(' | ')

    const scoreMatch = rest.match(/\*\*([\d.]+)\/5\*\*/)
    const score = scoreMatch ? parseFloat(scoreMatch[1]) * 20 : null // convert x/5 to 0-100

    const note = rest.replace(/\*\*[\d.]+\/5\*\*\s*(SKIP|HOLD|APPLY)?\s*—?\s*/, '').trim()
    const visaSponsorship = /sponsor|visa|expat|relocation/i.test(t)

    results.push({ id: id++, url, company, role, score, status, note, visaSponsorship })
  }
  return results
}

export default function ScanJobs() {
  const { showToast, profile, setPipeline, pipeline } = useApp()
  const [scanning, setScanning] = useState(false)
  const [region, setRegion] = useState('all')
  const [visaSponsorship, setVisaSponsorship] = useState(true)
  const [scanResults, setScanResults] = useState<ScanResult[]>([])
  const [manualInput, setManualInput] = useState('')
  const [method, setMethod] = useState<'auto' | 'manual'>('auto')
  const [filter, setFilter] = useState<'all' | Status>('all')

  const regionLabel = REGIONS.find(r => r.value === region)?.label || 'All UAE'

  const triggerAutoScan = async () => {
    if (scanning) return
    setScanning(true)
    setScanResults([])
    try {
      const res = await fetch(`${GITHUB_RAW}/data/pipeline.md`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const md = await res.text()
      const all = parsePipelineMd(md)
      const filtered = visaSponsorship ? all.filter(r => r.status !== 'discarded' || r.visaSponsorship) : all
      setScanResults(filtered)
      showToast(`${filtered.filter(r => r.status === 'pending').length} pending · ${filtered.filter(r => r.status === 'evaluated').length} evaluated`)
    } catch (e: any) {
      showToast(`Could not fetch scan data: ${e.message}`)
    }
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
        const results: ScanResult[] = d.jobs.map((j: any, i: number) => ({
          id: Date.now() + i,
          title: j.title || lines[i]?.slice(0, 80) || 'Job ' + (i + 1),
          company: j.company || 'Unknown',
          role: j.title || 'Unknown Role',
          url: j.url || '',
          status: 'pending' as Status,
          score: j.score ? j.score : null,
          note: '',
          visaSponsorship: j.visaSponsorship !== false,
        }))
        results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        setScanResults(results)
        showToast(`${results.length} jobs analyzed`)
      }
    } catch (e: any) {
      showToast(`Scan failed: ${e.message}`)
    }
    setScanning(false)
  }

  const addToPipeline = async (r: ScanResult) => {
    if (pipeline.some(p => p.url === r.url)) { showToast('Already in pipeline'); return }
    await setPipeline([...pipeline, { id: Date.now(), url: r.url, added: new Date().toISOString().slice(0, 10), company: r.company, role: r.role }])
    showToast(`${r.company} added to pipeline`)
  }

  const displayed = scanResults.filter(r => filter === 'all' || r.status === filter)

  const scoreColor = (s: number | null) =>
    s === null ? 'var(--text-faint)' : s >= 80 ? '#22c55e' : s >= 60 ? '#f59e0b' : '#ef4444'

  const statusBadge = (s: Status) => {
    if (s === 'pending') return { label: 'Pending', bg: '#3b82f620', color: '#3b82f6' }
    if (s === 'evaluated') return { label: 'Evaluated', bg: '#8b5cf620', color: '#8b5cf6' }
    return { label: 'Discarded', bg: '#ef444420', color: '#ef4444' }
  }

  return (
    <div className="view-wrap" style={{ padding: '36px 40px', maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5, margin: '0 0 5px' }}>Scan Jobs</h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>Live view of your daily UAE job scanner results, or paste URLs for AI scoring.</p>
      </div>

      <div className="card" style={{ padding: '20px 22px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className={`btn btn-xs ${method === 'auto' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMethod('auto')}>Auto Search</button>
          <button className={`btn btn-xs ${method === 'manual' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMethod('manual')}>Manual Paste</button>
        </div>

        {method === 'auto' && (
          <p style={{ fontSize: 12.5, color: 'var(--text-faint)', margin: '0 0 14px', lineHeight: 1.5 }}>
            Loads jobs discovered by the daily GitHub Actions scanner. Updates automatically every morning at 06:00 UAE time.
          </p>
        )}

        {method === 'auto' && (
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
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 5, color: 'var(--text-faint)' }}>Filters</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)', userSelect: 'none' }}>
                <input type="checkbox" checked={visaSponsorship} onChange={e => setVisaSponsorship(e.target.checked)}
                  style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
                Hide discarded
              </label>
            </div>
          </div>
        )}

        {method === 'manual' && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 6, color: 'var(--text-faint)' }}>
              Paste job URLs or descriptions (one per line)
            </label>
            <textarea value={manualInput} onChange={e => setManualInput(e.target.value)}
              placeholder={`Data Analyst at Emirates Group - Dubai\nhttps://ae.indeed.com/viewjob?jk=123`}
              style={{ width: '100%', minHeight: 100, padding: 10, fontSize: 13, fontFamily: 'inherit', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text)', resize: 'vertical' }} />
          </div>
        )}

        <button className="btn btn-primary" onClick={method === 'auto' ? triggerAutoScan : triggerManualScan}
          disabled={scanning || (method === 'manual' && !manualInput.trim())}
          style={{ opacity: scanning ? 0.6 : 1, cursor: scanning ? 'default' : 'pointer' }}>
          {scanning ? 'Loading...' : method === 'auto' ? (scanResults.length > 0 ? 'Refresh Scan' : 'Load Scanner Results') : 'Analyze Jobs'}
        </button>
      </div>

      {scanning && (
        <div style={{ textAlign: 'center', padding: '64px 24px' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 18px' }}></div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Fetching latest scan results…</div>
        </div>
      )}

      {scanResults.length > 0 && !scanning && (
        <div className="card">
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              {displayed.length} jobs {filter !== 'all' ? `(${filter})` : ''}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['all', 'pending', 'evaluated', 'discarded'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`btn btn-xs ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: 11, textTransform: 'capitalize' }}>
                  {f === 'all' ? `All (${scanResults.length})` : `${f} (${scanResults.filter(r => r.status === f).length})`}
                </button>
              ))}
            </div>
          </div>

          {displayed.map(r => {
            const badge = statusBadge(r.status)
            return (
              <div key={r.id} className="scan-row" style={{ alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: scoreColor(r.score), marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{r.company}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>— {r.role}</span>
                    <span style={{ fontSize: 9.5, fontWeight: 600, padding: '1px 5px', borderRadius: 4, background: badge.bg, color: badge.color, letterSpacing: 0.3 }}>
                      {badge.label}
                    </span>
                  </div>
                  {r.note && <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginBottom: 3 }}>{r.note}</div>}
                  <a href={r.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: 'var(--text-faint)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.url.replace(/^https?:\/\//, '')}
                  </a>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center', marginTop: 2 }}>
                  {r.score !== null && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(r.score), minWidth: 32, textAlign: 'right' }}>{(r.score / 20).toFixed(1)}/5</span>
                  )}
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer"
                      className="btn btn-xs"
                      style={{ background: '#22c55e', color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                      Apply ↗
                    </a>
                  )}
                  {r.status === 'pending' && (
                    <button className="btn btn-primary btn-xs" onClick={() => addToPipeline(r)}>+ Pipeline</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
