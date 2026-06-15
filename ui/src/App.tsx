import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Applications from './pages/Applications'
import Pipeline from './pages/Pipeline'
import ScanJobs from './pages/ScanJobs'
import FollowUps from './pages/FollowUps'
import CvEditor from './pages/CvEditor'
import CoverLetter from './pages/CoverLetter'
import Profile from './pages/Profile'
import Portals from './pages/Portals'
import Report from './pages/Report'
import Settings from './pages/Settings'
import { AppProvider, useApp } from './lib/context'

function ToastDisplay() {
  const { toast } = useApp()
  if (!toast) return null
  return (
    <div className="toast-pill">
      <span style={{ color: 'var(--success)', marginRight: 8 }}>✓</span>
      {toast}
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <div className="app-layout">
        <Sidebar />
        <main style={{ flex: 1, height: '100vh', overflowY: 'auto', background: 'var(--bg)', minWidth: 0 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/scan" element={<ScanJobs />} />
            <Route path="/followups" element={<FollowUps />} />
            <Route path="/cv" element={<CvEditor />} />
            <Route path="/cover-letter" element={<CoverLetter />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/portals" element={<Portals />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/report/:appId" element={<Report />} />
          </Routes>
        </main>
      </div>
      <ToastDisplay />
    </AppProvider>
  )
}
