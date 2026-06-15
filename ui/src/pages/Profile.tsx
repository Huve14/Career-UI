import { useState } from 'react'
import { useApp } from '../lib/context'

export default function ProfilePage() {
  const { profile, setProfile, showToast } = useApp()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ ...profile })

  const saveProfile = async () => {
    try {
      await setProfile(draft)
      setEditing(false)
      showToast('Profile saved')
    } catch (err) {
      showToast('Error saving profile')
    }
  }

  const cancelEdit = () => {
    setDraft({ ...profile })
    setEditing(false)
  }

  return (
    <div className="view-wrap" style={{ padding: '36px 40px', maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5, margin: '0 0 5px' }}>Profile</h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>Candidate profile synced to config/profile.yml</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          {!editing ? (
            <button className="btn btn-secondary" onClick={() => setEditing(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              Edit Profile
            </button>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={cancelEdit}>Cancel</button>
              <button className="btn btn-primary" onClick={saveProfile}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                Save to profile.yml
              </button>
            </>
          )}
        </div>
      </div>

      {!editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#fff', fontFamily: "'Space Grotesk',sans-serif", flexShrink: 0 }}>
                {profile.name?.charAt(0) || '?'}
              </div>
              <div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.3 }}>{profile.name || 'Not set'}</div>
                <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 3 }}>{profile.email} · {profile.location}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 5 }}>Visa / Work Status</div>
                <div style={{ fontSize: 13.5, color: 'var(--text)' }}>{profile.visaStatus || 'Not set'}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 5 }}>Target Roles</div>
                <div style={{ fontSize: 13.5, color: 'var(--text)' }}>{profile.targetRoles || 'Not set'}</div>
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: '22px 24px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 10 }}>Professional Narrative</div>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.65, margin: 0 }}>{profile.narrative || 'No narrative set.'}</p>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="form-label">Full Name</label>
                <input className="form-input" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Full name" />
              </div>
              <div>
                <label className="form-label">Email Address</label>
                <input className="form-input" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} placeholder="email@domain.com" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="form-label">Location</label>
                <input className="form-input" value={draft.location} onChange={e => setDraft({ ...draft, location: e.target.value })} placeholder="City, Country" />
              </div>
              <div>
                <label className="form-label">Visa / Work Status</label>
                <input className="form-input" value={draft.visaStatus} onChange={e => setDraft({ ...draft, visaStatus: e.target.value })} placeholder="e.g. Need UAE visa sponsorship" />
              </div>
            </div>
            <div>
              <label className="form-label">Target Roles (comma-separated)</label>
              <input className="form-input" value={draft.targetRoles} onChange={e => setDraft({ ...draft, targetRoles: e.target.value })} placeholder="Data Analyst, IT Specialist, BI Analyst" />
            </div>
            <div>
              <label className="form-label">Professional Narrative</label>
              <textarea className="form-input" style={{ minHeight: 100 }} value={draft.narrative} onChange={e => setDraft({ ...draft, narrative: e.target.value })} placeholder="Brief professional summary for cover letters and outreach..." />
            </div>
            <div>
              <label className="form-label">Superpowers (one per line)</label>
              <textarea className="form-input" style={{ minHeight: 80 }} value={draft.superpowers.join('\n')} onChange={e => setDraft({ ...draft, superpowers: e.target.value.split('\n').filter(s => s.trim()) })} placeholder="Automating manual workflows&#10;End-to-end BI dashboard delivery&#10;IT infrastructure management" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
