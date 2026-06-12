import { useState } from 'react'
import { useApp } from '../lib/context'

export default function Portals() {
  const { portals, setPortals, showToast } = useApp()
  const [posInput, setPosInput] = useState('')
  const [negInput, setNegInput] = useState('')
  const [addForm, setAddForm] = useState(false)
  const [newCo, setNewCo] = useState({ name: '', url: '' })

  const addPositive = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || !posInput.trim()) return
    setPortals({ ...portals, positiveKeywords: [...portals.positiveKeywords, posInput.trim()] })
    setPosInput('')
  }

  const removePositive = (kw: string) => {
    setPortals({ ...portals, positiveKeywords: portals.positiveKeywords.filter(k => k !== kw) })
  }

  const addNegative = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || !negInput.trim()) return
    setPortals({ ...portals, negativeKeywords: [...portals.negativeKeywords, negInput.trim()] })
    setNegInput('')
  }

  const removeNegative = (kw: string) => {
    setPortals({ ...portals, negativeKeywords: portals.negativeKeywords.filter(k => k !== kw) })
  }

  const toggleCompany = async (id: number) => {
    const companies = portals.companies.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c)
    setPortals({ ...portals, companies })
  }

  const addCompany = () => {
    if (!newCo.name) return
    const companies = [...portals.companies, { id: Date.now(), name: newCo.name, url: newCo.url, enabled: true }]
    setPortals({ ...portals, companies })
    setAddForm(false)
    setNewCo({ name: '', url: '' })
    showToast('Company added to portals')
  }

  return (
    <div className="view-wrap" style={{ padding: '36px 40px', maxWidth: 900 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5, margin: '0 0 5px' }}>Portals Config</h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>Configure job scanning keywords and tracked company portals.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 20 }}>
        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 5 }}>Positive Keywords</div>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.5 }}>Roles matching these terms will be included in scan results.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 34, marginBottom: 12 }}>
            {portals.positiveKeywords.map(kw => (
              <span key={kw} className="kw-chip" data-type="positive">
                {kw}
                <span className="kw-chip-x" onClick={() => removePositive(kw)}>×</span>
              </span>
            ))}
          </div>
          <input className="form-input" value={posInput} onChange={e => setPosInput(e.target.value)} onKeyDown={addPositive} placeholder="Type a keyword and press Enter" />
        </div>
        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 5 }}>Negative Keywords</div>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.5 }}>Roles matching these terms will be excluded from scan results.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 34, marginBottom: 12 }}>
            {portals.negativeKeywords.map(kw => (
              <span key={kw} className="kw-chip" data-type="negative">
                {kw}
                <span className="kw-chip-x" onClick={() => removeNegative(kw)}>×</span>
              </span>
            ))}
          </div>
          <input className="form-input" value={negInput} onChange={e => setNegInput(e.target.value)} onKeyDown={addNegative} placeholder="Type a keyword and press Enter" />
        </div>
      </div>

      <div className="card">
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>Tracked Companies</div>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>Toggle scanning per company portal.</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setAddForm(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add Company
          </button>
        </div>

        {addForm && (
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
              <div>
                <label className="form-label">Company Name</label>
                <input className="form-input" value={newCo.name} onChange={e => setNewCo({ ...newCo, name: e.target.value })} placeholder="e.g. Emirates NBD" />
              </div>
              <div>
                <label className="form-label">Careers URL</label>
                <input className="form-input" value={newCo.url} onChange={e => setNewCo({ ...newCo, url: e.target.value })} placeholder="https://company.com/careers" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={addCompany}>Add Company</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setAddForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {portals.companies.map(co => (
          <div key={co.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: '1px solid var(--border-faint)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{co.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-faint)', fontFamily: "'JetBrains Mono',monospace", marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{co.url}</div>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 56, textAlign: 'right' }}>{co.enabled ? 'Enabled' : 'Disabled'}</span>
            <button className="toggle-track" data-on={co.enabled.toString()} onClick={() => toggleCompany(co.id)}></button>
          </div>
        ))}

        {portals.companies.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No companies added yet.</div>
        )}
      </div>
    </div>
  )
}
