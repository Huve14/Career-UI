import { useState } from 'react'
import { useApp } from '../lib/context'

export default function SettingsPage() {
  const { user, signInSupabase, signUpSupabase, signOutSupabase, syncToSupabase, syncFromSupabase, showToast, refresh } = useApp()
  const [tab, setTab] = useState<'import' | 'export' | 'about'>('about')
  const [importText, setImportText] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)

  const isBrowser = !window.careerOps?.readFile

  const handleSignIn = async () => {
    setAuthLoading(true)
    const err = await signInSupabase(email, password)
    setAuthLoading(false)
    if (err) showToast(err)
    else showToast('Signed in')
  }

  const handleSignUp = async () => {
    setAuthLoading(true)
    const err = await signUpSupabase(email, password)
    setAuthLoading(false)
    if (err) showToast(err)
    else showToast('Account created!')
  }

  const handleSignOut = async () => {
    await signOutSupabase()
    showToast('Signed out')
  }

  const handleSyncTo = async () => {
    setSyncLoading(true)
    const err = await syncToSupabase()
    setSyncLoading(false)
    if (err) showToast(err)
    else showToast('Data synced to cloud')
  }

  const handleSyncFrom = async () => {
    setSyncLoading(true)
    const err = await syncFromSupabase()
    setSyncLoading(false)
    if (err) showToast(err)
    else showToast('Data synced from cloud')
  }

  const handleImport = async () => {
    try {
      const parsed = JSON.parse(importText)
      const { seedFromFiles } = await import('../lib/data')
      await seedFromFiles(
        parsed.applications,
        parsed.cv,
        parsed.profile,
        parsed.pipeline,
        parsed.followUps,
        parsed.portals,
      )
      await refresh()
      showToast('Data imported successfully')
    } catch {
      showToast('Invalid import data')
    }
  }

  const handleExport = () => {
    const data = localStorage.getItem('career-ops-data')
    if (!data) {
      showToast('No data to export')
      return
    }
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'career-ops-backup.json'
    a.click()
    URL.revokeObjectURL(url)
    showToast('Data exported')
  }

  return (
    <div className="view-wrap" style={{ padding: '36px 40px', maxWidth: 800 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5, margin: '0 0 5px' }}>Settings</h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>
          {user ? `Signed in as ${user.email}` : isBrowser ? 'Browser mode — sign in to sync to cloud' : 'Electron mode'}
        </p>
      </div>

      {/* Auth Section */}
      {isBrowser && (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, margin: '0 0 16px', color: 'var(--text)' }}>
            {user ? 'Cloud Sync' : 'Sign In / Sign Up'}
          </h3>

          {!user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="form-input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
              <input className="form-input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" onClick={handleSignIn} disabled={authLoading}>
                  {authLoading ? 'Signing in...' : 'Sign In'}
                </button>
                <button className="btn btn-secondary" onClick={handleSignUp} disabled={authLoading}>
                  {authLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 4 }}>
                Your data syncs between this browser and the cloud.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" onClick={handleSyncTo} disabled={syncLoading}>
                  {syncLoading ? 'Syncing...' : 'Upload to Cloud'}
                </button>
                <button className="btn btn-secondary" onClick={handleSyncFrom} disabled={syncLoading}>
                  {syncLoading ? 'Syncing...' : 'Download from Cloud'}
                </button>
                <button className="btn btn-ghost" onClick={handleSignOut}>Sign Out</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['about', 'import', 'export'] as const).map(t => (
          <button key={t} className={`btn ${tab === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'about' && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, margin: '0 0 12px', color: 'var(--text)' }}>Career-Ops UI</h3>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.65, margin: 0 }}>
            {isBrowser
              ? 'Running in browser mode. Your data is stored in localStorage. Sign in with email and password above to sync your data to Supabase cloud storage.'
              : 'Running in Electron mode. All data is read/written directly to the career-ops filesystem.'}
          </p>
        </div>
      )}

      {tab === 'import' && (
        <div className="card" style={{ padding: 24 }}>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: '0 0 12px' }}>
            Paste JSON backup or individual career-ops file content below.
          </p>
          <textarea
            className="form-input"
            style={{ minHeight: 300, fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder='Paste exported JSON here...'
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={handleImport}>Import Data</button>
          </div>
        </div>
      )}

      {tab === 'export' && (
        <div className="card" style={{ padding: 24 }}>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: '0 0 16px' }}>
            Download a JSON backup of all your data.
          </p>
          <button className="btn btn-primary" onClick={handleExport}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: -2 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download Backup
          </button>
        </div>
      )}
    </div>
  )
}
