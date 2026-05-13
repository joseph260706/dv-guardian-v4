import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore, startTicker } from './store'
import { Sidebar, TopBar, AlertBanner, AISidePanel } from './components/layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AlertConsole from './pages/AlertConsole'
import IncidentManager from './pages/IncidentManager'
import RackAnalytics from './pages/RackAnalytics'
import AssetManager from './pages/AssetManager'
import PredictiveAI from './pages/PredictiveAI'
import Sustainability from './pages/Sustainability'
import SecurityCentre from './pages/SecurityCentre'
import AutomationEngine from './pages/AutomationEngine'
import AIAssistant from './pages/AIAssistant'
import CapacityPlanning from './pages/CapacityPlanning'
import Reporting from './pages/Reporting'
import Settings from './pages/Settings'
import NetworkTopology from './pages/NetworkTopology'
import ComputeVMs from './pages/ComputeVMs'
import SimulationLab from './pages/SimulationLab'
import { Bot } from 'lucide-react'
import toast from 'react-hot-toast'

function KeyboardShortcuts({ onAI }: { onAI: () => void }) {
  const navigate = useNavigate()
  const [g, setG] = useState(false)
  useEffect(() => {
    const map: Record<string,string> = { d:'/', a:'/alerts', i:'/incidents', r:'/racks', n:'/infrastructure', p:'/predictions', s:'/sustainability', c:'/security', e:'/settings', t:'/automation', l:'/simulation' }
    const fn = (e: KeyboardEvent) => {
      if (['INPUT','TEXTAREA','SELECT'].includes((e.target as HTMLElement)?.tagName)) return
      if (e.key === 'g') { setG(true); setTimeout(() => setG(false), 1000); return }
      if (e.key === '`') { onAI(); return }
      if (e.key === '?') toast('G+D=Dashboard G+A=Alerts G+I=Incidents G+R=Racks ` =AI', { duration: 5000 })
      if (g && map[e.key]) navigate(map[e.key])
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [g, navigate, onAI])
  return null
}

function Shell({ children }: { children: React.ReactNode }) {
  const [mobile, setMobile] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <div className="hidden lg:flex"><Sidebar /></div>
      {mobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobile(false)} />
          <div className="relative z-10"><Sidebar mobile onClose={() => setMobile(false)} /></div>
        </div>
      )}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <TopBar onMenu={() => setMobile(true)} />
        <AlertBanner />
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <KeyboardShortcuts onAI={() => setAiOpen(v => !v)} />
            {children}
          </main>
          <AISidePanel open={aiOpen} onClose={() => setAiOpen(false)} />
        </div>
        {!aiOpen && (
          <button onClick={() => setAiOpen(true)}
            className="fixed bottom-6 right-6 w-12 h-12 bg-purple border border-purple/30 rounded-full flex items-center justify-center shadow-lg hover:bg-purple/80 transition-all z-30"
            title="Open AI Copilot (`)">
            <Bot className="w-5 h-5 text-white" />
          </button>
        )}
      </div>
    </div>
  )
}

function Protected({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" replace />
  return <Shell>{children}</Shell>
}

export default function App() {
  return (
    <BrowserRouter basename="/dv-guardian-v4">
      <Toaster position="top-right" toastOptions={{ style: { background:'#161b27', color:'#f1f5f9', border:'1px solid #1e2d45', fontFamily:'JetBrains Mono', fontSize:'12px' }, duration: 3000 }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Protected><Dashboard /></Protected>} />
        <Route path="/alerts" element={<Protected><AlertConsole /></Protected>} />
        <Route path="/incidents" element={<Protected><IncidentManager /></Protected>} />
        <Route path="/racks" element={<Protected><RackAnalytics /></Protected>} />
        <Route path="/infrastructure" element={<Protected><AssetManager /></Protected>} />
        <Route path="/network" element={<Protected roles={['super_admin','admin','operator']}><NetworkTopology /></Protected>} />
        <Route path="/compute" element={<Protected roles={['super_admin','admin','operator']}><ComputeVMs /></Protected>} />
        <Route path="/predictions" element={<Protected><PredictiveAI /></Protected>} />
        <Route path="/sustainability" element={<Protected><Sustainability /></Protected>} />
        <Route path="/security" element={<Protected roles={['super_admin','admin']}><SecurityCentre /></Protected>} />
        <Route path="/automation" element={<Protected roles={['super_admin','admin','operator']}><AutomationEngine /></Protected>} />
        <Route path="/assistant" element={<Protected roles={['super_admin','admin','operator']}><AIAssistant /></Protected>} />
        <Route path="/capacity" element={<Protected roles={['super_admin','admin']}><CapacityPlanning /></Protected>} />
        <Route path="/simulation" element={<Protected roles={['super_admin','admin','operator']}><SimulationLab /></Protected>} />
        <Route path="/reports" element={<Protected><Reporting /></Protected>} />
        <Route path="/settings" element={<Protected><Settings /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
