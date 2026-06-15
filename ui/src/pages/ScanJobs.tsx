import { useState } from 'react'
import { useApp } from '../lib/context'

export default function ScanJobs() {
  const { showToast, portals, profile } = useApp()
  const [scanning, setScanning] = useState(false)
  const [scanResults, setScanResults] = useState<
    { id: number; title: string; company: string; location: string; score: number; url: string; source?: string }[]
  >([])
  const [deepseekKey, setDeepseekKey] = useState(() => localStorage.getItem('deepseek-key') || '')
  const [showKeyInput, setShowKeyInput] = useState(!localStorage.getItem('deepseek-key'))

  const triggerScan = async () => {
    if (scanning) return
    setScanning(true)
    setScanResults([])

    try {
      const body: Record<string, any> = { portals, profile }
      if (deepseekKey) {
        body.deepseekKey = deepseekKey
      }

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error(`API error: ${res.status}`)

      const data = await res.json()
      if (data.jobs && data.jobs.length > 0) {
        setScanResults(data.jobs)
        showToast(`Scan complete — ${data.count} offers found (${data.source})`)
      } else {
        // Fallback: try local mock with DeepSeek
        if (deepseekKey) {
          await tryDeepSeekDirect()
        } else {
          showToast('No jobs found. Add a DeepSeek API key for better results.')
        }
      }
    } catch (err: any) {
      showToast('Scan failed: ' + (err.message || 'unknown error'))
      // Fallback to direct DeepSeek if API unavailable
      if (deepseekKey) await tryDeepSeekDirect()
    } finally {
      setScanning(false)
    }
  }

  const tryDeepSeekDirect = async () => {
    if (!deepseekKey) return
    try {
      const targetRoles = profile.targetRoles || 'Data Analyst, IT Specialist, BI Analyst'
      const superpowers = profile.superpowers?.join(', ') || 'data analysis, BI, IT support'

      const prompt = `You are a UAE job search expert. List 15-20 real, currently active job openings in the UAE (Dubai, Abu Dhabi) matching these criteria:

Target Roles: ${targetRoles}
Skills: ${superpowers}
Needs: UAE visa sponsorship

For each job, provide: title, company, location, and a direct application URL if known.

Return ONLY a JSON array with objects containing: title, company, location, url, score (0-100 fit score).
The score should reflect how well the role matches the candidate's target roles and skills.`

      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${deepseekKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.5,
        }),
      })

      if (!res.ok) {
        showToast('DeepSeek API error — check your key')
        return
      }

      const data = await res.json()
      const content = data?.choices?.[0]?.message?.content
      if (!content) {
        showToast('No results from DeepSeek')
        return
      }

      const jobs = JSON.parse(content.replace(/```json\s*|\s*```/g, '').trim())
      if (Array.isArray(jobs) && jobs.length > 0) {
        const mapped = jobs.map((j: any, i: number) => ({
          id: i + 1,
          title: j.title || j.Title || '',
          company: j.company || j.Company || '',
          location: j.location || j.Location || 'UAE',
          score: j.score || j.Score || 70,
          url: j.url || j.Url || j.application_url || '',
          source: 'DeepSeek AI',
        }))
        setScanResults(mapped)
        showToast(`DeepSeek found ${mapped.length} matching roles`)
      }
    } catch {
      showToast('DeepSeek analysis failed')
    }
  }

  const saveKey = () => {
    localStorage.setItem('deepseek-key', deepseekKey)
    setShowKeyInput(false)
    showToast('API key saved')
  }

  const scoreLevel = (s: number) => s >= 85 ? 'high' : s >= 65 ? 'mid' : 'low'

  return (
    <div className="view-wrap" style={{ padding: '36px 40px', maxWidth: 860 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5, margin: '0 0 5px' }}>Scan Jobs</h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>
          Search UAE job boards and AI-powered analysis for matching positions.
        </p>
      </div>

      {/* DeepSeek API Key */}
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', flex: 1 }}>
            {showKeyInput ? (
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  className="form-input"
                  style={{ flex: 1, fontSize: 12.5, padding: '6px 10px' }}
                  type="password"
                  placeholder="sk-... (free from platform.deepseek.com)"
                  value={deepseekKey}
                  onChange={e => setDeepseekKey(e.target.value)}
                />
                <button className="btn btn-primary btn-xs" onClick={saveKey}>Save</button>
              </span>
            ) : (
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span>DeepSeek AI {deepseekKey ? 'configured' : 'not set'}</span>
                <button className="btn btn-ghost btn-xs" onClick={() => setShowKeyInput(true)}>Change</button>
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="card" style={{ padding: 22, marginBottom: 20 }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>Run Scanner</div>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.5 }}>
          Scans Indeed UAE, Gulftalent, and Naukri Gulf for your target roles. With a DeepSeek API key, also does AI-powered job matching and scoring.
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
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Scanning UAE portals...</div>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>Searching Indeed, Gulftalent, Naukri Gulf and analyzing with AI.</p>
        </div>
      )}

      {scanResults.length > 0 && !scanning && (
        <div className="card">
          <div style={{ padding: '16px 20px 13px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              Scan Results ({scanResults.length})
            </span>
            {scanResults[0]?.source && (
              <span style={{ fontSize: 11, color: 'var(--text-faint)', background: 'var(--surface2)', padding: '2px 8px', borderRadius: 6 }}>
                {scanResults[0].source}
              </span>
            )}
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
                {r.url ? (
                  <a href={r.url} target="_blank" className="btn btn-primary btn-xs" rel="noreferrer">View Job</a>
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
