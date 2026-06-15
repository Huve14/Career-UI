import { useState } from 'react'
import { useApp } from '../lib/context'

export default function Login() {
  const { signInSupabase, signUpSupabase } = useApp()
  const [mode, setMode] = useState<'signin' | 'register'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')

    if (!email.trim() || !password.trim()) { setError('Email and password are required.'); return }
    if (mode === 'register' && password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }

    setLoading(true)
    if (mode === 'signin') {
      const err = await signInSupabase(email.trim(), password)
      if (err) setError(err)
    } else {
      const err = await signUpSupabase(email.trim(), password)
      if (err) setError(err)
      else setInfo('Check your email to confirm your account, then sign in.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 52, height: 52, background: 'var(--accent)', borderRadius: 14,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: 'var(--text)', letterSpacing: -0.5 }}>career-ops</div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 4 }}>UAE Job Search Pipeline</div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '28px 28px 24px' }}>
          {/* Tab toggle */}
          <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 8, padding: 3, marginBottom: 24 }}>
            {(['signin', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setInfo('') }}
                style={{
                  flex: 1, padding: '7px 0', border: 'none', borderRadius: 6, cursor: 'pointer',
                  fontFamily: "'DM Sans',sans-serif", fontSize: 13.5, fontWeight: 500,
                  background: mode === m ? 'var(--surface)' : 'transparent',
                  color: mode === m ? 'var(--text)' : 'var(--text-muted)',
                  boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                  transition: 'all 0.15s',
                }}>
                {m === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, letterSpacing: 0.3 }}>
                Email
              </label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: mode === 'register' ? 14 : 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, letterSpacing: 0.3 }}>
                Password
              </label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                style={{ width: '100%' }}
              />
            </div>

            {mode === 'register' && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, letterSpacing: 0.3 }}>
                  Confirm Password
                </label>
                <input
                  className="form-input"
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  style={{ width: '100%' }}
                />
              </div>
            )}

            {error && (
              <div style={{ background: '#ef444420', border: '1px solid #ef444440', borderRadius: 7, padding: '9px 12px', marginBottom: 16, fontSize: 13, color: '#ef4444' }}>
                {error}
              </div>
            )}

            {info && (
              <div style={{ background: '#22c55e20', border: '1px solid #22c55e40', borderRadius: 7, padding: '9px 12px', marginBottom: 16, fontSize: 13, color: '#22c55e' }}>
                {info}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '10px 0', fontSize: 14, opacity: loading ? 0.7 : 1, cursor: loading ? 'default' : 'pointer' }}
            >
              {loading ? (mode === 'signin' ? 'Signing in…' : 'Creating account…') : (mode === 'signin' ? 'Sign In' : 'Create Account')}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: 'var(--text-faint)' }}>
          Your data is private and encrypted — stored securely in Supabase.
        </div>
      </div>
    </div>
  )
}
