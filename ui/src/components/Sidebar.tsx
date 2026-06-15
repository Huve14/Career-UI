import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../lib/context'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { applications, pipeline, followUps, profile, signOutSupabase, showToast } = useApp()

  const handleSignOut = async () => {
    await signOutSupabase()
    showToast('Signed out')
  }

  const path = location.pathname
  const go = (p: string) => () => navigate(p)

  const navItems = [
    { path: '/dashboard',    label: 'Dashboard',     icon: GridIcon, badge: null },
    { path: '/applications', label: 'Applications',  icon: ListIcon,  badge: applications.length.toString() },
    { path: '/pipeline',     label: 'Pipeline',       icon: ClockIcon, badge: pipeline.length ? pipeline.length.toString() : null },
    { path: '/scan',         label: 'Scan Jobs',      icon: SearchIcon, badge: null },
    { path: '/followups',    label: 'Follow-ups',     icon: BellIcon,  badge: followUps.filter(f => f.overdue).length ? followUps.filter(f => f.overdue).length.toString() : null },
  ]

  const docItems = [
    { path: '/cv',           label: 'CV Editor',      icon: DocIcon },
    { path: '/cover-letter', label: 'Cover Letter',   icon: MailIcon },
  ]

  const configItems = [
    { path: '/profile',      label: 'Profile',        icon: UserIcon },
    { path: '/portals',      label: 'Portals',        icon: GlobeIcon },
    { path: '/settings',     label: 'Settings',       icon: SettingsIcon },
  ]

  return (
    <aside style={{ width: 224, minWidth: 224, height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
      <div style={{ padding: '22px 18px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 36, height: 36, background: 'var(--accent)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          </div>
          <div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15.5, color: 'var(--text)', letterSpacing: -0.5 }}>career-ops</div>
            <div style={{ fontSize: 10, color: 'var(--text-faint)', letterSpacing: 0.7, textTransform: 'uppercase', marginTop: 1 }}>Job Search Pipeline</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '8px 10px 10px', overflowY: 'auto' }}>
        <SectionTitle text="Workspace" />
        {navItems.map(item => (
          <NavItem key={item.path} icon={item.icon} label={item.label} active={path.startsWith(item.path)} onClick={go(item.path)} badge={item.badge} />
        ))}

        <SectionTitle text="Documents" />
        {docItems.map(item => (
          <NavItem key={item.path} icon={item.icon} label={item.label} active={path.startsWith(item.path)} onClick={go(item.path)} />
        ))}

        <SectionTitle text="Config" />
        {configItems.map(item => (
          <NavItem key={item.path} icon={item.icon} label={item.label} active={path.startsWith(item.path)} onClick={go(item.path)} />
        ))}
      </nav>

      <div style={{ padding: '14px 12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div onClick={go('/profile')} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9, background: 'var(--surface2)', cursor: 'pointer', minWidth: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: "'Space Grotesk',sans-serif", flexShrink: 0 }}>
              {profile.name?.charAt(0) || '?'}
            </div>
            <div style={{ overflow: 'hidden', minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.name || 'Unnamed'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.location || 'No location set'}</div>
            </div>
          </div>
          <button onClick={handleSignOut} title="Sign out"
            style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}

function SectionTitle({ text }: { text: string }) {
  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-faint)', padding: '14px 10px 4px' }}>
      {text}
    </div>
  )
}

function NavItem({ icon: Icon, label, active, onClick, badge }: { icon: any; label: string; active: boolean; onClick: () => void; badge?: string | null }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 7,
        cursor: 'pointer', color: active ? 'var(--text)' : 'var(--text-muted)',
        fontFamily: "'DM Sans',sans-serif", fontSize: 13.5, fontWeight: active ? 500 : 400,
        borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
        background: active ? 'var(--accent-dim)' : 'transparent',
        marginBottom: 1, transition: 'color 0.12s, background 0.12s', userSelect: 'none',
      }}
    >
      <Icon />
      <span>{label}</span>
      {badge && (
        <span style={{ marginLeft: 'auto', background: 'var(--accent-dim)', color: 'var(--accent-text)', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10 }}>
          {badge}
        </span>
      )}
    </div>
  )
}

// ── Icons (inline SVG components) ─────────────────────────────

function GridIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect></svg> }
function ListIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg> }
function ClockIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 8 12 12 14 14"></polyline></svg> }
function SearchIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> }
function BellIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg> }
function DocIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg> }
function MailIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> }
function UserIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="12" r="4"></circle></svg> }
function GlobeIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg> }
function SettingsIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> }
