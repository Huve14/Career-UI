import { useState, useEffect } from 'react'
import { useApp } from '../lib/context'

const REGIONS = [
  { value: 'all', label: 'All UAE' },
  { value: 'dubai', label: 'Dubai' },
  { value: 'abu-dhabi', label: 'Abu Dhabi' },
  { value: 'sharjah', label: 'Sharjah' },
  { value: 'remote', label: 'Remote / WFH' },
]

export default function ScanJobs() {
  const { showToast, portals, profile } = useApp()
  const [scanning, setScanning] = useState(false)
  const [region, setRegion] = useState('all')
  const [visaSponsorship, setVisaSponsorship] = useState(true)
  const [scanResults, setScanResults] = useState<
    { id: number; title: string; company: string; location: string; score: number; url: string; source?: string; visaSponsorship?: boolean }[]
  >([])
  const [hasServerKey, setHasServerKey] = useState(false)

  useEffect(() => {
    fetch('/api/scan').then(r => {
      if (r.status === 405) setHasServerKey(true)
    }).catch(() => {})
  }, [])

  const triggerScan = async () => {
    if (scanning) return
    setScanning(true)
    setScanResults([])

    try {
      const body: Record<string, any> = { portals, profile, region, visaSponsorship }

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        showToast(`Scan API error (${res.status})`)
        return
      }

      const data = await res.json()
      if (data.jobs && data.jobs.length > 0) {
        setScanResults(data.jobs)
        const mode = data.deepseek ? 'AI scored' : 'web scraped'
        showToast(`${data.count} jobs found (${mode})`)
      } else {
        showToast('No matching jobs found')
      }
    } catch (err: any) {
      showToast('Scan failed: ' + (err.message || 'unknown error'))
    } finally {
      setScanning(false)
    }
  }

  const scoreLevel = (s: number) => s >= 85 ? 'high' : s >= 65 ? 'mid' : 'low'

  const regionLabel = REGIONS.find(r => r.value === region)?.label || 'All UAE'

  return (
    <div className="view-wrap" style={{ padding: '36px 40px', maxWidth: 860 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5, margin: '0 0 5px' }}>Scan Jobs</h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>
          Search UAE job boards for your target roles with AI-powered matching.
        </p>
      </div>

      <div className="card" style={{ padding: '20px 22px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Run Scanner</div>
          <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 6, background: 'var(--accent-dim)', color: 'var(--accent-text)' }}>
            {hasServerKey ? 'DeepSeek AI' : 'Web Scrape'}
          </span>
        </div>

        {/* Filters row */}
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
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>Searching Indeed, Gulftalent, Naukri Gulf.</p>
        </div>
      )}

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
