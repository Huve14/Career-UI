import { useNavigate } from 'react-router-dom'
import { useApp } from '../lib/context'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const navigate = useNavigate()
  const { applications, pipeline, followUps, profile } = useApp()

  const statsTotal = applications.length
  const statsInterview = applications.filter(a => a.status === 'Interview').length
  const statsOffer = applications.filter(a => a.status === 'Offer').length
  const pipelineCount = pipeline.length
  const overdueCount = followUps.filter(f => f.overdue).length
  const firstName = profile.name?.split(' ')[0] || 'there'

  // Score distribution for histogram
  const buckets = [
    { range: '< 60', count: applications.filter(a => a.score < 60).length },
    { range: '60-69', count: applications.filter(a => a.score >= 60 && a.score < 70).length },
    { range: '70-79', count: applications.filter(a => a.score >= 70 && a.score < 80).length },
    { range: '80-89', count: applications.filter(a => a.score >= 80 && a.score < 90).length },
    { range: '90+', count: applications.filter(a => a.score >= 90).length },
  ]

  const recentApps = [...applications].slice(-5).reverse()

  const scoreLevel = (s: number) => s >= 85 ? 'high' : s >= 70 ? 'mid' : 'low'
  const scoreColors = { high: 'var(--success)', mid: 'var(--warning)', low: 'var(--error)' }

  return (
    <div className="view-wrap" style={{ padding: '36px 40px', maxWidth: 1160 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.6, margin: '0 0 6px' }}>
          Good morning, {firstName}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Your job search at a glance — {statsTotal} applications tracked.</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard label="Total" value={statsTotal} sub="Applications" color="var(--text)" />
        <StatCard label="Interview" value={statsInterview} sub="Active rounds" color="var(--warning)" />
        <StatCard label="Offer" value={statsOffer} sub="Pending decisions" color="var(--offer)" />
        <StatCard label="Pipeline" value={pipelineCount} sub="Pending evaluation" color="var(--accent-text)" />
      </div>

      {/* Score + Recent */}
      <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: 16, marginBottom: 22 }}>
        <div className="card" style={{ padding: '22px 22px 18px' }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>Score Distribution</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={buckets}>
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'var(--text)' }}
              />
              <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div style={{ padding: '16px 20px 13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Recent Applications</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/applications')}>View all →</button>
          </div>
          <table className="data-table">
            <thead><tr><th>Company</th><th>Role</th><th>Score</th><th>Status</th></tr></thead>
            <tbody>
              {recentApps.map(a => (
                <tr key={a.id} onClick={() => navigate(`/report/${a.id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600 }}>{a.company}</td>
                  <td style={{ color: 'var(--text-muted)', maxWidth: 210, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.role}</td>
                  <td>
                    <span className="score-badge" data-level={scoreLevel(a.score)}>{a.score}</span>
                  </td>
                  <td><span className="status-badge" data-status={a.status}>{a.status}</span></td>
                </tr>
              ))}
              {recentApps.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No applications yet — add one to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <div style={{ background: 'var(--error-dim)', border: '1px solid rgba(255,69,58,0.17)', borderRadius: 10, padding: '15px 20px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--error)' }}>{overdueCount} overdue follow-up{overdueCount > 1 ? 's' : ''}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>Some follow-ups need your attention.</div>
          </div>
          <button className="btn btn-danger btn-sm" style={{ marginLeft: 'auto' }} onClick={() => navigate('/followups')}>Review Follow-ups</button>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  return (
    <div className="stat-card">
      <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.9, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 12 }}>{label}</div>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 42, fontWeight: 700, color, letterSpacing: -2, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>
    </div>
  )
}
