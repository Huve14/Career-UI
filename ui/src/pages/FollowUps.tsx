import { useState } from 'react'
import { useApp } from '../lib/context'

export default function FollowUps() {
  const { followUps, setFollowUps, showToast } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [newFu, setNewFu] = useState({ company: '', role: '', type: 'Email', notes: '' })

  const addFollowUp = async () => {
    if (!newFu.company) return
    const fu = {
      id: Date.now(),
      company: newFu.company,
      role: newFu.role,
      date: new Date().toISOString().slice(0, 10),
      type: newFu.type,
      notes: newFu.notes,
      overdue: false,
    }
    await setFollowUps([...followUps, fu])
    setShowForm(false)
    setNewFu({ company: '', role: '', type: 'Email', notes: '' })
    showToast('Follow-up logged')
  }

  return (
    <div className="view-wrap" style={{ padding: '36px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5, margin: '0 0 5px' }}>Follow-ups</h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>Track outreach and next steps for each active application.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Log Follow-up
        </button>
      </div>

      <div className="card">
        <table className="data-table">
          <thead><tr><th>Company</th><th>Role</th><th>Date</th><th>Type</th><th>Notes</th></tr></thead>
          <tbody>
            {followUps.map(f => (
              <tr key={f.id} data-overdue={f.overdue.toString()} style={f.overdue ? { background: 'rgba(255,69,58,0.04)' } : undefined}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ fontWeight: 600 }}>{f.company}</span>
                    {f.overdue && (
                      <span style={{ display: 'inline-flex', padding: '1px 7px', borderRadius: 3, fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', background: 'var(--error-dim)', color: 'var(--error)' }}>Overdue</span>
                    )}
                  </div>
                </td>
                <td style={{ color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.role}</td>
                <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: 12.5 }}>{f.date}</td>
                <td>
                  <span style={{ display: 'inline-flex', padding: '2px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 500, background: 'var(--surface2)', color: 'var(--text-muted)' }}>{f.type}</span>
                </td>
                <td style={{ color: 'var(--text-muted)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5 }}>{f.notes}</td>
              </tr>
            ))}
            {followUps.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No follow-ups logged yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Log Follow-up Modal */}
      {showForm && (
        <div className="modal-bg" onClick={() => setShowForm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.3 }}>Log Follow-up</h2>
              <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', fontSize: 16 }} onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="form-label">Company *</label>
                  <input className="form-input" value={newFu.company} onChange={e => setNewFu({ ...newFu, company: e.target.value })} placeholder="Company name" />
                </div>
                <div>
                  <label className="form-label">Role</label>
                  <input className="form-input" value={newFu.role} onChange={e => setNewFu({ ...newFu, role: e.target.value })} placeholder="Role title" />
                </div>
              </div>
              <div>
                <label className="form-label">Contact Type</label>
                <select className="form-input" value={newFu.type} onChange={e => setNewFu({ ...newFu, type: e.target.value })}>
                  <option value="Email">Email</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Phone">Phone</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="form-label">Notes</label>
                <textarea className="form-input" value={newFu.notes} onChange={e => setNewFu({ ...newFu, notes: e.target.value })} placeholder="What was discussed, next steps..." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={addFollowUp}>Log Follow-up</button>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
