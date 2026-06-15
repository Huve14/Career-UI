import { useState, useEffect, useRef } from 'react'
import { useApp } from '../lib/context'
import type { Profile } from '../types'

const EMPTY: Profile = {
  name: '', email: '', phone: '', location: '', linkedin: '', portfolioUrl: '',
  visaStatus: '', targetRoles: '', salaryMin: '', salaryMax: '',
  narrative: '', headline: '', superpowers: [],
}

declare global {
  interface Window {
    pdfjsLib?: any
  }
}

async function loadPdfJs(): Promise<any> {
  if (window.pdfjsLib) return window.pdfjsLib
  return new Promise((resolve, reject) => {
    const ver = '3.11.174'
    const script = document.createElement('script')
    script.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${ver}/pdf.min.js`
    script.onload = () => {
      window.pdfjsLib!.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${ver}/pdf.worker.min.js`
      resolve(window.pdfjsLib)
    }
    script.onerror = () => reject(new Error('Failed to load PDF.js'))
    document.head.appendChild(script)
  })
}

async function extractPdfText(file: File): Promise<string> {
  const lib = await loadPdfJs()
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await lib.getDocument({ data: arrayBuffer }).promise
  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    fullText += content.items.map((item: any) => item.str).join(' ') + '\n'
  }
  return fullText.trim()
}

export default function ProfilePage() {
  const { profile, setProfile, showToast } = useApp()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Profile>({ ...EMPTY, ...profile })
  const [saving, setSaving] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(p => ({ ...EMPTY, ...profile, superpowers: profile.superpowers || p.superpowers }))
  }, [profile])

  const field = (key: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft(d => ({ ...d, [key]: e.target.value }))

  const saveProfile = async () => {
    setSaving(true)
    try {
      await setProfile(draft)
      setEditing(false)
      showToast('Profile saved')
    } catch {
      showToast('Error saving profile')
    }
    setSaving(false)
  }

  const cancelEdit = () => {
    setDraft({ ...EMPTY, ...profile })
    setEditing(false)
    setParseError('')
  }

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      setParseError('Please upload a PDF file.')
      return
    }
    setParsing(true)
    setParseError('')
    try {
      const text = await extractPdfText(file)
      if (!text || text.length < 50) {
        setParseError('Could not extract text from this PDF. It may be a scanned image — try a text-based PDF.')
        setParsing(false)
        return
      }
      const res = await fetch('/api/parse-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setParseError(data.error || 'Parsing failed')
        setParsing(false)
        return
      }
      const p = data.profile
      setDraft(d => ({
        ...d,
        name: p.name || d.name,
        email: p.email || d.email,
        phone: p.phone || d.phone,
        location: p.location || d.location,
        headline: p.headline || d.headline,
        targetRoles: p.targetRoles || d.targetRoles,
        narrative: p.narrative || d.narrative,
        superpowers: (p.superpowers?.length ? p.superpowers : d.superpowers),
        linkedin: p.linkedin || d.linkedin,
        visaStatus: p.visaStatus || d.visaStatus,
      }))
      showToast('CV parsed — review and save your profile')
    } catch (err: any) {
      setParseError(err.message || 'Unknown error')
    }
    setParsing(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const isEmpty = !profile.name && !profile.email

  return (
    <div className="view-wrap" style={{ padding: '36px 40px', maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5, margin: '0 0 5px' }}>Profile</h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>Your candidate profile — synced to Supabase</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          {!editing ? (
            <button className="btn btn-secondary" onClick={() => setEditing(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              {isEmpty ? 'Set Up Profile' : 'Edit Profile'}
            </button>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={cancelEdit} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </>
          )}
        </div>
      </div>

      {isEmpty && !editing && (
        <div className="card" style={{ padding: '40px 28px', textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>👤</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>No profile yet</div>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: '0 0 18px' }}>Upload your CV to auto-fill, or set up your profile manually.</p>
          <button className="btn btn-primary" onClick={() => setEditing(true)}>Set Up Profile</button>
        </div>
      )}

      {!editing && !isEmpty && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#fff', fontFamily: "'Space Grotesk',sans-serif", flexShrink: 0 }}>
                {profile.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.3 }}>{profile.name}</div>
                {profile.headline && <div style={{ fontSize: 13.5, color: 'var(--accent)', marginTop: 2 }}>{profile.headline}</div>}
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{[profile.email, profile.location].filter(Boolean).join(' · ')}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <Field label="Phone" value={profile.phone} />
              <Field label="Visa / Work Status" value={profile.visaStatus} />
              <Field label="LinkedIn" value={profile.linkedin} link />
              <Field label="Portfolio" value={profile.portfolioUrl} link />
              <Field label="Target Roles" value={profile.targetRoles} span />
              <Field label="Salary Range" value={[profile.salaryMin, profile.salaryMax].filter(Boolean).join(' – ')} />
            </div>
          </div>

          {profile.narrative && (
            <div className="card" style={{ padding: '20px 24px' }}>
              <SectionLabel text="Professional Narrative" />
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.65, margin: 0 }}>{profile.narrative}</p>
            </div>
          )}

          {profile.superpowers?.length > 0 && (
            <div className="card" style={{ padding: '20px 24px' }}>
              <SectionLabel text="Superpowers" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {profile.superpowers.map((s, i) => (
                  <span key={i} style={{ fontSize: 12.5, padding: '4px 10px', borderRadius: 20, background: 'var(--accent-dim)', color: 'var(--accent-text)' }}>{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {editing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── CV Upload / Auto-fill ───────────────────────────── */}
          <div className="card" style={{ padding: '18px 24px', background: 'var(--accent-dim)', border: '1px solid rgba(0,113,227,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
                  Auto-fill from CV
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  Upload a PDF CV — DeepSeek AI extracts your details automatically
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={handleCvUpload}
                />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={parsing}
                  style={{ minWidth: 140 }}
                >
                  {parsing ? (
                    <>
                      <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      Parsing…
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      Upload PDF CV
                    </>
                  )}
                </button>
                {parseError && (
                  <div style={{ fontSize: 12, color: 'var(--error)', maxWidth: 260, textAlign: 'right' }}>{parseError}</div>
                )}
              </div>
            </div>
          </div>

          {/* ── Identity ────────────────────────────────────────── */}
          <div className="card" style={{ padding: 24 }}>
            <SectionLabel text="Identity" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label className="form-label">Full Name</label>
                <input className="form-input" value={draft.name} onChange={field('name')} placeholder="Huveshan Naicker" />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={draft.email} onChange={field('email')} placeholder="you@example.com" />
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input className="form-input" value={draft.phone} onChange={field('phone')} placeholder="+27 74 474 4786" />
              </div>
              <div>
                <label className="form-label">Location</label>
                <input className="form-input" value={draft.location} onChange={field('location')} placeholder="Johannesburg → Dubai / Abu Dhabi" />
              </div>
              <div>
                <label className="form-label">LinkedIn URL</label>
                <input className="form-input" value={draft.linkedin} onChange={field('linkedin')} placeholder="https://linkedin.com/in/..." />
              </div>
              <div>
                <label className="form-label">Portfolio URL</label>
                <input className="form-input" value={draft.portfolioUrl} onChange={field('portfolioUrl')} placeholder="https://yoursite.dev" />
              </div>
            </div>
            <div>
              <label className="form-label">Headline</label>
              <input className="form-input" value={draft.headline} onChange={field('headline')} placeholder="Data Analyst & IT Specialist | BI, Automation & Infrastructure" />
            </div>
          </div>

          {/* ── Job Search ──────────────────────────────────────── */}
          <div className="card" style={{ padding: 24 }}>
            <SectionLabel text="Job Search" />
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Target Roles (comma-separated)</label>
              <input className="form-input" value={draft.targetRoles} onChange={field('targetRoles')} placeholder="Data Analyst, IT Specialist, BI Analyst" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label className="form-label">Salary Min (AED/month)</label>
                <input className="form-input" value={draft.salaryMin} onChange={field('salaryMin')} placeholder="12,000" />
              </div>
              <div>
                <label className="form-label">Salary Max (AED/month)</label>
                <input className="form-input" value={draft.salaryMax} onChange={field('salaryMax')} placeholder="25,000" />
              </div>
            </div>
            <div>
              <label className="form-label">Visa / Work Status</label>
              <input className="form-input" value={draft.visaStatus} onChange={field('visaStatus')} placeholder="South African — requires employer visa sponsorship" />
            </div>
          </div>

          {/* ── Narrative ───────────────────────────────────────── */}
          <div className="card" style={{ padding: 24 }}>
            <SectionLabel text="Narrative" />
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Professional Narrative</label>
              <textarea className="form-input" style={{ minHeight: 110, resize: 'vertical' }}
                value={draft.narrative} onChange={field('narrative')}
                placeholder="Brief professional summary used in cover letters, evaluations, and outreach…" />
            </div>
            <div>
              <label className="form-label">Superpowers (one per line)</label>
              <textarea className="form-input" style={{ minHeight: 90, resize: 'vertical' }}
                value={draft.superpowers.join('\n')}
                onChange={e => setDraft(d => ({ ...d, superpowers: e.target.value.split('\n') }))}
                placeholder={"Automating manual workflows with n8n + Claude API\nEnd-to-end BI dashboard delivery (Zoho, Power BI)\nIT infrastructure for 250+ users across SA and UAE"} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 14 }}>
      {text}
    </div>
  )
}

function Field({ label, value, link, span }: { label: string; value?: string; link?: boolean; span?: boolean }) {
  if (!value) return null
  return (
    <div style={span ? { gridColumn: '1 / -1' } : {}}>
      <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 4 }}>{label}</div>
      {link ? (
        <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 13.5, color: 'var(--accent)', textDecoration: 'none' }}>{value}</a>
      ) : (
        <div style={{ fontSize: 13.5, color: 'var(--text)' }}>{value}</div>
      )}
    </div>
  )
}
