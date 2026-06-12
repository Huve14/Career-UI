import { useState } from 'react'
import { useApp } from '../lib/context'

export default function CoverLetter() {
  const { profile, showToast } = useApp()
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [url, setUrl] = useState('')
  const [generated, setGenerated] = useState(false)
  const [content, setContent] = useState('')

  const generate = () => {
    if (!company || !role) return
    const text = `Dear Hiring Team at ${company},

I am writing to express my enthusiastic interest in the ${role} position. With a proven track record in data analysis, business intelligence, and IT infrastructure management, I am confident I can make a meaningful contribution to your team at ${company}.

In my current role as Data Analyst & IT Specialist, I reduced manual reporting workload by 60% by engineering automated BI dashboards powered by live API integrations. I also deployed autonomous AI agents for customer support and lead triage, eliminating manual bottlenecks for executive operations.

${profile.narrative ? `\n${profile.narrative}\n` : ''}

What excites me about ${company} is the opportunity to bring my expertise in BI automation, data engineering, and IT management to support your data-driven decision-making. I am immediately available and ready to relocate.

Thank you for considering my application. I look forward to the possibility of contributing to ${company}'s success.

Warm regards,
${profile.name || 'Huveshan Dino Naicker'}
${profile.email || 'huve@fortune3hsk.co.za'}`
    setContent(text)
    setGenerated(true)
    showToast('Cover letter generated')
  }

  const copyContent = () => {
    navigator.clipboard.writeText(content)
    showToast('Cover letter copied to clipboard')
  }

  return (
    <div className="view-wrap" style={{ padding: '36px 40px', maxWidth: 1080 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5, margin: '0 0 5px' }}>Cover Letter Generator</h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>Generate a tailored cover letter from your profile and CV.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>
        <div className="card" style={{ padding: 22, alignSelf: 'start' }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 18 }}>Job Details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div>
              <label className="form-label">Company Name</label>
              <input className="form-input" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Emirates Group" />
            </div>
            <div>
              <label className="form-label">Role Title</label>
              <input className="form-input" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Data Analyst" />
            </div>
            <div>
              <label className="form-label">Job URL (optional)</label>
              <input className="form-input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://company.com/jobs/123" />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 6 }} onClick={generate}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
              Generate Cover Letter
            </button>
          </div>
        </div>

        <div className="card" style={{ overflow: 'hidden', minHeight: 400 }}>
          <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Preview</span>
            {generated && (
              <button className="btn btn-secondary btn-sm" onClick={copyContent}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                Copy to Clipboard
              </button>
            )}
          </div>
          {!generated ? (
            <div style={{ padding: '64px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: 38, marginBottom: 16, opacity: 0.4 }}>✉</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 7 }}>No letter generated yet</div>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>Fill in the job details on the left and click Generate.</p>
            </div>
          ) : (
            <div style={{ padding: '28px 30px', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
              <pre style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13.5, lineHeight: 1.78, color: 'var(--text)', whiteSpace: 'pre-wrap', margin: 0 }}>{content}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
