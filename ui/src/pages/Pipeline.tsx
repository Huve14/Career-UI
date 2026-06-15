import { useState } from 'react'
import { useApp } from '../lib/context'

export default function Pipeline() {
  const { pipeline, setPipeline, showToast } = useApp()
  const [newUrl, setNewUrl] = useState('')

  const addUrl = async () => {
    const u = newUrl.trim()
    if (!u) return
    await setPipeline([...pipeline, { id: Date.now(), url: u, added: new Date().toISOString().slice(0, 10) }])
    setNewUrl('')
    showToast('URL added to pipeline')
  }

  const removeUrl = async (id: number) => {
    await setPipeline(pipeline.filter(x => x.id !== id))
    showToast('Removed from pipeline')
  }

  const evaluate = async (url: string) => {
    showToast(`Evaluating: ${url.slice(0, 60)}...`)
    // This would call the career-ops pipeline, but for now simulate
    setTimeout(() => showToast('Evaluation complete — added to Applications'), 1500)
  }

  return (
    <div className="view-wrap" style={{ padding: '36px 40px', maxWidth: 860 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5, margin: '0 0 5px' }}>Pipeline Inbox</h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>{pipeline.length} URLs queued for evaluation</p>
      </div>

      <div className="card" style={{ padding: '20px 22px', marginBottom: 20 }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>Add Job URL</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            className="form-input"
            style={{ flex: 1 }}
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addUrl()}
            placeholder="Paste a job URL and press Enter"
          />
          <button className="btn btn-primary" onClick={addUrl} style={{ flexShrink: 0 }}>Add to Pipeline</button>
        </div>
      </div>

      <div className="card">
        {pipeline.length === 0 ? (
          <div style={{ padding: '52px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 34, marginBottom: 14 }}>📭</div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Pipeline is empty</div>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>Add job URLs above to start evaluating positions.</p>
          </div>
        ) : (
          pipeline.map(item => (
            <div key={item.id} className="pipeline-row">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
              <div style={{ flex: 1, minWidth: 0 }}>
                {item.company && item.role && (
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.company} — {item.role}
                  </div>
                )}
                <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', textDecoration: 'none' }}>
                  {item.url.replace(/^https?:\/\//, '').slice(0, 80)}
                </a>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>Added {item.added}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="btn btn-primary btn-xs" onClick={() => evaluate(item.url)}>Evaluate</button>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn btn-xs" style={{ background: 'var(--accent-green, #22c55e)', color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Apply ↗
                </a>
                <button className="btn btn-danger btn-xs" onClick={() => removeUrl(item.id)}>Remove</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
