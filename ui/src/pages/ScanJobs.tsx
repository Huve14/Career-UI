import { useState } from 'react'
import { useApp } from '../lib/context'

export default function ScanJobs() {
  const { showToast } = useApp()
  const [scanning, setScanning] = useState(false)
  const [scanResults, setScanResults] = useState<{ id: number; title: string; company: string; location: string; score: number; url: string }[]>([])

  const triggerScan = () => {
    if (scanning) return
    setScanning(true)
    setScanResults([])
    // In production, this would call window.careerOps.runScan()
    setTimeout(() => {
      setScanResults([
        { id: 1, title: 'Data Analyst', company: 'Emirates Group', location: 'Dubai, UAE', score: 82, url: 'https://emirates.com/careers/data-analyst' },
        { id: 2, title: 'IT Support Specialist', company: 'ADNOC', location: 'Abu Dhabi, UAE', score: 76, url: 'https://adnoc.ae/careers/it-support' },
        { id: 3, title: 'BI Analyst', company: 'First Abu Dhabi Bank', location: 'Abu Dhabi, UAE', score: 88, url: 'https://bankfab.com/careers/bi-analyst' },
        { id: 4, title: 'Business Intelligence Developer', company: 'Majid Al Futtaim', location: 'Dubai, UAE', score: 79, url: 'https://careers.majidalfuttaim.com' },
        { id: 5, title: 'IT Specialist', company: 'DP World', location: 'Dubai, UAE', score: 71, url: 'https://dpworld.com/careers' },
      ])
      setScanning(false)
      showToast('Scan complete — 5 new offers found')
    }, 2500)
  }

  const scoreLevel = (s: number) => s >= 85 ? 'high' : s >= 70 ? 'mid' : 'low'

  return (
    <div className="view-wrap" style={{ padding: '36px 40px', maxWidth: 860 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5, margin: '0 0 5px' }}>Scan Jobs</h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>Search tracked portals and job boards for new matching positions.</p>
      </div>

      <div className="card" style={{ padding: 22, marginBottom: 20 }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>Run Scanner</div>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.5 }}>
          Scans all tracked companies and job boards configured in portals.yml. Uses title and location filters to find matching roles.
        </p>
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
      </div>

      {scanning && (
        <div style={{ textAlign: 'center', padding: '64px 24px' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 18px' }}></div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Scanning portals...</div>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>Searching tracked companies and job boards.</p>
        </div>
      )}

      {scanResults.length > 0 && !scanning && (
        <div className="card">
          <div style={{ padding: '16px 20px 13px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Scan Results</span>
          </div>
          {scanResults.map(r => (
            <div key={r.id} className="scan-row">
              <div>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: scoreLevel(r.score) === 'high' ? 'var(--success)' : scoreLevel(r.score) === 'mid' ? 'var(--warning)' : 'var(--error)' }}></div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{r.title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{r.company} · {r.location}</div>
              </div>
              <span className="score-badge" data-level={scoreLevel(r.score)} style={{ flexShrink: 0, marginRight: 4 }}>{r.score}</span>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <a href={r.url} target="_blank" className="btn btn-primary btn-xs">View Job</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
