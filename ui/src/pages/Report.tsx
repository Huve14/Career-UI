import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../lib/context'

export default function Report() {
  const { appId } = useParams()
  const navigate = useNavigate()
  const { applications, setApplications, showToast } = useApp()

  const app = applications.find(a => a.id === Number(appId))

  if (!app) {
    return (
      <div style={{ padding: '36px 40px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text-muted)' }}>Application not found</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/applications')}>Back to Applications</button>
      </div>
    )
  }

  const s = app.score
  const col = s >= 85 ? '#30d158' : s >= 70 ? '#ff9f0a' : '#ff453a'
  const grade = s >= 90 ? 'A' : s >= 80 ? 'B' : s >= 70 ? 'C' : s >= 60 ? 'D' : 'F'

  const reco = s >= 85
    ? 'Strong Apply — Top-tier match. Prioritize this and tailor your CV for maximum impact.'
    : s >= 70
    ? 'Apply — Good fit with minor gaps. Address concerns in your cover letter.'
    : 'Low Priority — Significant mismatches detected. Only apply if pipeline is thin.'

  const breakdown = [
    { label: 'Role Match', value: Math.min(100, s + 5) },
    { label: 'Company Fit', value: Math.min(100, s - 2) },
    { label: 'Comp Alignment', value: Math.min(100, s - 7) },
    { label: 'Legitimacy (G)', value: 98 },
  ]

  const markAsApplied = async () => {
    await setApplications(applications.map(a => a.id === app.id ? { ...a, status: 'Applied' } : a))
    showToast('Status updated to Applied')
  }

  return (
    <div className="view-wrap" style={{ padding: '36px 40px', maxWidth: 880 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/applications')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Back
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.4, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {app.company} — {app.role}
          </h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '2px 0 0' }}>Evaluation Report</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <button className="btn btn-success-soft btn-sm" onClick={markAsApplied}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Mark as Applied
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => showToast('PDF generated — saved to output/')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Generate CV PDF
          </button>
        </div>
      </div>

      <div className="card" style={{ overflow: 'visible' }}>
        <div style={{ padding: '28px 32px', fontFamily: "'DM Sans',sans-serif", color: 'var(--text)' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 28 }}>
            <div>
              <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 5px', letterSpacing: -0.4 }}>{app.role}</h1>
              <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>{app.company}</div>
              <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 4 }}>Evaluated: {app.date}</div>
            </div>
            <div style={{ textAlign: 'center', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 26px', flexShrink: 0 }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 54, fontWeight: 700, lineHeight: 1, color: col }}>{grade}</div>
              <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 5, fontWeight: 600 }}>Grade</div>
            </div>
          </div>

          {/* Score bar */}
          <div style={{ marginBottom: 26 }}>
            <div style={{ fontSize: 10.5, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.9, fontWeight: 600, marginBottom: 9 }}>Overall Score</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1, height: 8, background: 'var(--surface3)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${s}%`, height: '100%', background: col, borderRadius: 4, transition: 'width 1s cubic-bezier(.4,0,.2,1)' }}></div>
              </div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: col, minWidth: 60, textAlign: 'right' }}>
                {s}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-faint)' }}>/100</span>
              </div>
            </div>
          </div>

          {/* Breakdown + Fit */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.9, fontWeight: 600, color: 'var(--text-faint)', marginBottom: 16 }}>Score Breakdown</div>
              {breakdown.map(b => (
                <div key={b.label} style={{ marginBottom: 11 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{b.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Grotesk',sans-serif" }}>{b.value}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--surface3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${b.value}%`, height: '100%', background: col, borderRadius: 3 }}></div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.9, fontWeight: 600, color: 'var(--text-faint)', marginBottom: 12 }}>Fit Assessment</div>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.65, margin: '0 0 16px' }}>{app.notes || 'No notes available.'}</p>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.9, fontWeight: 600, color: 'var(--text-faint)', marginBottom: 6 }}>Status</div>
                <span className="status-badge" data-status={app.status}>{app.status}</span>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.9, fontWeight: 600, color: 'var(--text-faint)', marginBottom: 10 }}>Recommendation</div>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.65, margin: 0, fontWeight: s >= 85 ? 500 : 400 }}>
              {reco}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
