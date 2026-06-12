import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../lib/context'
import type { Application, ApplicationStatus } from '../types'

export default function Applications() {
  const navigate = useNavigate()
  const { applications, setApplications, showToast } = useApp()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all')
  const [addingApp, setAddingApp] = useState(false)
  const [newApp, setNewApp] = useState({ company: '', role: '', url: '', notes: '' })

  const filteredApps = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return applications.filter(a => {
      if (q && !a.company.toLowerCase().includes(q) && !a.role.toLowerCase().includes(q)) return false
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      return true
    })
  }, [applications, searchQuery, statusFilter])

  const scoreLevel = (s: number) => s >= 85 ? 'high' : s >= 70 ? 'mid' : 'low'

  const statusOptions: ApplicationStatus[] = ['Applied', 'Interview', 'Offer', 'Rejected', 'Evaluated', 'Responded', 'Discarded', 'SKIP']

  const updateStatus = async (id: number, status: ApplicationStatus) => {
    await setApplications(applications.map(a => a.id === id ? { ...a, status } : a))
    showToast('Status updated')
  }

  const addApp = async () => {
    if (!newApp.company || !newApp.role) return
    const app: Application = {
      id: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      company: newApp.company,
      role: newApp.role,
      score: 0,
      status: 'Evaluated',
      pdf: false,
      report: '',
      notes: newApp.notes,
    }
    await setApplications([...applications, app])
    setAddingApp(false)
    setNewApp({ company: '', role: '', url: '', notes: '' })
    showToast('Application added')
  }

  const FilterBtn = ({ label, value }: { label: string; value: ApplicationStatus | 'all' }) => (
    <button
      className={`btn btn-sm ${statusFilter === value ? 'btn-primary' : 'btn-secondary'}`}
      onClick={() => setStatusFilter(value)}
    >
      {label}
    </button>
  )

  return (
    <div className="view-wrap" style={{ padding: '36px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5, margin: '0 0 5px' }}>Applications</h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>{filteredApps.length} results · sorted by date</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAddingApp(true)} style={{ flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add Application
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180, maxWidth: 320, position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input className="form-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search company or role..." style={{ paddingLeft: 34 }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <FilterBtn label="All" value="all" />
          <FilterBtn label="Applied" value="Applied" />
          <FilterBtn label="Interview" value="Interview" />
          <FilterBtn label="Offer" value="Offer" />
          <FilterBtn label="Rejected" value="Rejected" />
        </div>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr><th>Date</th><th>Company</th><th>Role</th><th>Score</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
          </thead>
          <tbody>
            {filteredApps.map(a => (
              <tr key={a.id} onClick={() => navigate(`/report/${a.id}`)} style={{ cursor: 'pointer' }}>
                <td style={{ color: 'var(--text-muted)', fontSize: 12.5, whiteSpace: 'nowrap' }}>{a.date}</td>
                <td style={{ fontWeight: 600 }}>{a.company}</td>
                <td style={{ color: 'var(--text-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.role}</td>
                <td><span className="score-badge" data-level={scoreLevel(a.score)}>{a.score}</span></td>
                <td onClick={e => e.stopPropagation()}>
                  <select className="form-input" style={{ width: 116, padding: '5px 26px 5px 8px', fontSize: 12.5 }} value={a.status} onChange={e => updateStatus(a.id, e.target.value as ApplicationStatus)}>
                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-ghost btn-xs" onClick={e => { e.stopPropagation(); navigate(`/report/${a.id}`) }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    View Report
                  </button>
                </td>
              </tr>
            ))}
            {filteredApps.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No applications match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Application Modal */}
      {addingApp && (
        <div className="modal-bg" onClick={() => setAddingApp(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.3 }}>Add Application</h2>
              <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', fontSize: 16 }} onClick={() => setAddingApp(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="form-label">Company Name *</label>
                <input className="form-input" value={newApp.company} onChange={e => setNewApp({ ...newApp, company: e.target.value })} placeholder="e.g. Emirates" />
              </div>
              <div>
                <label className="form-label">Role Title *</label>
                <input className="form-input" value={newApp.role} onChange={e => setNewApp({ ...newApp, role: e.target.value })} placeholder="e.g. Data Analyst" />
              </div>
              <div>
                <label className="form-label">Job URL</label>
                <input className="form-input" value={newApp.url} onChange={e => setNewApp({ ...newApp, url: e.target.value })} placeholder="https://company.com/jobs/123" />
              </div>
              <div>
                <label className="form-label">Notes</label>
                <textarea className="form-input" value={newApp.notes} onChange={e => setNewApp({ ...newApp, notes: e.target.value })} placeholder="Initial impressions, key requirements..." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={addApp}>Add Application</button>
              <button className="btn btn-secondary" onClick={() => setAddingApp(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
