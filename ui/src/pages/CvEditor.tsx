import { useMemo } from 'react'
import { useApp } from '../lib/context'

export default function CvEditor() {
  const { cv, setCv, showToast } = useApp()

  const renderedHtml = useMemo(() => parseMarkdown(cv), [cv])

  return (
    <div className="view-wrap" style={{ padding: '36px 40px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5, margin: '0 0 5px' }}>CV Editor</h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>Edit your canonical CV in Markdown. Auto-saves to cv.md.</p>
        </div>
        <button className="btn btn-primary" onClick={() => showToast('PDF generated — saved to output/')} style={{ flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Generate PDF
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, flex: 1, minHeight: 0 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.7 }}>Markdown Source</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-faint)', fontFamily: "'JetBrains Mono',monospace" }}>cv.md</span>
          </div>
          <textarea
            className="form-input"
            value={cv}
            onChange={e => setCv(e.target.value)}
            style={{ flex: 1, border: 'none', borderRadius: 0, background: 'transparent', fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, lineHeight: 1.75, resize: 'none', padding: '18px 20px', color: 'var(--text)' }}
          />
        </div>

        <div className="card" style={{ overflowY: 'auto' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.7 }}>Live Preview</span>
          </div>
          <div className="cv-rendered" style={{ padding: '20px 24px', lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: renderedHtml }} />
        </div>
      </div>
    </div>
  )
}

function parseMarkdown(md: string): string {
  return md.split('\n').map(line => {
    if (line.startsWith('# ')) return `<h1>${escapeHtml(line.slice(2))}</h1>`
    if (line.startsWith('## ')) return `<h2>${escapeHtml(line.slice(3))}</h2>`
    if (line.startsWith('### ')) return `<h3>${escapeHtml(line.slice(4))}</h3>`
    if (line.startsWith('- ')) return `<li>${formatInline(line.slice(2))}</li>`
    if (line === '---') return '<hr>'
    if (!line.trim()) return ''
    return `<p>${formatInline(line)}</p>`
  }).join('\n')
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function formatInline(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
}
