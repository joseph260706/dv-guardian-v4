import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Server, Leaf, AlertTriangle, Bot, TrendingUp,
  FlaskConical, FileText, Settings, Shield, Zap, Bell, LogOut,
  Wifi, Menu, X, Building2, Activity, Cpu, Network, Database,
  Play, ChevronRight
} from 'lucide-react'
import { useAlertStore, useAuthStore, useConfigStore, useAIStore, useNotifStore } from '../../store'
import { getAIResponse, RACKS } from '../../data/engine'
import { Markdown } from '../shared'
import { format } from 'date-fns'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const NAV_SECTIONS = [
  {
    title: 'Operations',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Command Center', roles: ['super_admin','admin','operator','viewer'] },
      { to: '/alerts', icon: AlertTriangle, label: 'Alert Console', roles: ['super_admin','admin','operator','viewer'], alertBadge: true },
      { to: '/incidents', icon: Activity, label: 'Incident Manager', roles: ['super_admin','admin','operator','viewer'] },
      { to: '/automation', icon: Play, label: 'Automation Engine', roles: ['super_admin','admin','operator'] },
    ]
  },
  {
    title: 'Infrastructure',
    items: [
      { to: '/racks', icon: Server, label: 'Rack Analytics', roles: ['super_admin','admin','operator','viewer'] },
      { to: '/infrastructure', icon: Building2, label: 'Asset Manager', roles: ['super_admin','admin','operator','viewer'] },
      { to: '/network', icon: Network, label: 'Network Topology', roles: ['super_admin','admin','operator'] },
      { to: '/compute', icon: Cpu, label: 'Compute & VMs', roles: ['super_admin','admin','operator'] },
    ]
  },
  {
    title: 'Intelligence',
    items: [
      { to: '/predictions', icon: TrendingUp, label: 'Predictive AI', roles: ['super_admin','admin','operator','viewer'] },
      { to: '/sustainability', icon: Leaf, label: 'Sustainability', roles: ['super_admin','admin','operator','viewer'] },
      { to: '/capacity', icon: Database, label: 'Capacity Planning', roles: ['super_admin','admin'] },
      { to: '/assistant', icon: Bot, label: 'AI Copilot', roles: ['super_admin','admin','operator'] },
    ]
  },
  {
    title: 'Management',
    items: [
      { to: '/security', icon: Shield, label: 'Security Centre', roles: ['super_admin','admin'] },
      { to: '/simulation', icon: FlaskConical, label: 'Simulation Lab', roles: ['super_admin','admin','operator'] },
      { to: '/reports', icon: FileText, label: 'Reports', roles: ['super_admin','admin','operator','viewer'] },
      { to: '/settings', icon: Settings, label: 'Settings', roles: ['super_admin','admin','operator','viewer'] },
    ]
  },
]

export function Sidebar({ mobile=false, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const { unackedCount } = useAlertStore()
  const { user } = useAuthStore()
  const { cfg } = useConfigStore()

  return (
    <aside className={clsx('flex flex-col bg-surface border-r border-border', mobile ? 'w-64 h-full' : 'w-52 flex-shrink-0')}>
      {/* Logo */}
      <div className="px-4 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-accent/10 border border-accent/20 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-accent" />
          </div>
          <div>
            <div className="font-mono font-bold text-xs text-text-primary leading-tight">DCIM Platform</div>
            <div className="text-[9px] font-mono text-text-secondary">v4.0 · Enterprise</div>
          </div>
        </div>
        {mobile && <button onClick={onClose} className="p-1 rounded hover:bg-card"><X className="w-4 h-4 text-text-secondary" /></button>}
      </div>

      {/* User */}
      {user && (
        <div className="px-3 py-2.5 border-b border-border">
          <div className="text-[9px] font-mono text-text-secondary truncate">{cfg.orgName}</div>
          <div className="text-xs font-mono text-text-primary truncate mt-0.5">{user.email}</div>
          <span className={clsx('text-[9px] font-mono font-bold uppercase border rounded px-1.5 py-0.5 mt-1 inline-block',
            user.role === 'super_admin' ? 'text-purple border-purple/30' : user.role === 'admin' ? 'text-accent border-accent/30' : user.role === 'operator' ? 'text-warning border-warning/30' : 'text-text-secondary border-border'
          )}>{user.role.replace('_',' ')}</span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-4">
        {NAV_SECTIONS.map(section => {
          const visible = section.items.filter(i => user && i.roles.includes(user.role))
          if (!visible.length) return null
          return (
            <div key={section.title}>
              <div className="text-[9px] font-mono font-bold text-text-muted uppercase tracking-widest px-2 mb-1">{section.title}</div>
              <div className="space-y-0.5">
                {visible.map(({ to, icon: Icon, label, alertBadge }) => (
                  <NavLink key={to} to={to} end={to==='/'} onClick={onClose}
                    className={({ isActive }) => clsx('flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono transition-all group',
                      isActive ? 'bg-accent/10 text-accent border border-accent/15' : 'text-text-secondary hover:text-text-primary hover:bg-card')}>
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate flex-1">{label}</span>
                    {alertBadge && unackedCount > 0 && (
                      <span className="bg-critical text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex-shrink-0">
                        {unackedCount > 99 ? '99+' : unackedCount}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-success">
          <span className="live-dot" /><span>LIVE · {cfg.dcName}</span>
        </div>
        <div className="text-[9px] font-mono text-text-muted mt-0.5">Press ? for shortcuts</div>
      </div>
    </aside>
  )
}

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const { user, clearAuth } = useAuthStore()
  const { unackedCount } = useAlertStore()
  const { count: notifCount, reset: resetNotif } = useNotifStore()
  const navigate = useNavigate()
  const [time, setTime] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t) }, [])

  return (
    <header className="h-11 bg-surface/80 backdrop-blur-sm border-b border-border flex items-center px-4 gap-3 flex-shrink-0 sticky top-0 z-20">
      <button onClick={onMenu} className="lg:hidden p-1.5 rounded hover:bg-card">
        <Menu className="w-4 h-4 text-text-secondary" />
      </button>

      <div className="flex items-center gap-2 text-xs font-mono text-success">
        <Wifi className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">LIVE</span>
        <span className="live-dot" />
      </div>

      <div className="hidden md:block font-mono text-xs text-text-secondary">{time.toUTCString().replace(' GMT','Z')}</div>

      <div className="flex-1" />

      <button onClick={() => { navigate('/alerts'); resetNotif() }} className="relative p-1.5 rounded-lg hover:bg-card transition-colors">
        <Bell className="w-4 h-4 text-text-secondary" />
        {(unackedCount + notifCount) > 0 && (
          <span className="absolute -top-1 -right-1 bg-critical text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {(unackedCount + notifCount) > 99 ? '99+' : unackedCount + notifCount}
          </span>
        )}
      </button>

      {user && (
        <>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-mono text-text-secondary truncate max-w-[140px]">{user.email}</span>
          </div>
          <button onClick={() => { clearAuth(); navigate('/login') }} className="p-1.5 rounded hover:bg-card transition-colors" title="Logout">
            <LogOut className="w-4 h-4 text-text-secondary hover:text-critical transition-colors" />
          </button>
        </>
      )}
    </header>
  )
}

export function AlertBanner() {
  const { alerts, ack } = useAlertStore()
  const critical = alerts.filter((a: any) => a.severity === 'critical' && !a.acknowledged)
  if (!critical.length) return null
  return (
    <div className="bg-critical/8 border-b border-critical/25 px-4 py-2 flex items-center gap-3 flex-shrink-0">
      <AlertTriangle className="w-3.5 h-3.5 text-critical flex-shrink-0 animate-pulse" />
      <div className="flex gap-4 overflow-hidden flex-1">
        {critical.slice(0,2).map((a: any) => (
          <div key={a.id} className="flex items-center gap-2 text-xs font-mono min-w-0">
            <span className="text-critical font-bold flex-shrink-0">CRITICAL:</span>
            <span className="text-text-secondary truncate">{a.title}</span>
            <button onClick={() => ack(a.id)} className="text-critical/40 hover:text-critical flex-shrink-0">✕</button>
          </div>
        ))}
        {critical.length > 2 && <span className="text-xs font-mono text-critical/60 flex-shrink-0">+{critical.length-2} more</span>}
      </div>
    </div>
  )
}

// ── AI Side Panel ─────────────────────────────────────────────────────────────
const AI_SUGGESTIONS = [
  "Why is rack overheating?", "Summarise the current outage",
  "What does UPS-C2 affect?", "Show all critical risks",
  "How do we improve PUE?", "What playbooks should run now?",
  "Analyse power infrastructure", "What is our energy spend?",
]

export function AISidePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { messages, thinking, add, setThinking, clear } = useAIStore()
  const [input, setInput] = useState('')
  const bottomRef = { current: null as HTMLDivElement | null }

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  if (!open) return null

  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg) return
    setInput('')
    add({ id: Date.now().toString(), role: 'user', content: msg, ts: new Date() })
    setThinking(true)
    await new Promise(r => setTimeout(r, 600 + Math.random() * 800))
    const response = getAIResponse(msg)
    add({ id: (Date.now()+1).toString(), role: 'assistant', content: response, ts: new Date() })
    setThinking(false)
  }

  return (
    <div className="w-80 flex-shrink-0 border-l border-border flex flex-col bg-surface/60">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-purple/20 rounded-lg flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-purple" />
          </div>
          <span className="font-mono text-xs font-bold text-text-primary">AI Operations Copilot</span>
          <span className="live-dot" />
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clear} className="text-[10px] font-mono text-text-secondary hover:text-text-primary px-1.5 py-0.5 rounded hover:bg-card">Clear</button>
          <button onClick={onClose} className="p-1 rounded hover:bg-card"><X className="w-3.5 h-3.5 text-text-secondary" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="text-xs font-mono text-text-secondary text-center py-4">
              AI infrastructure operations assistant.<br />Ask anything about your data centre.
            </div>
            <div className="section-title">Suggested queries</div>
            {AI_SUGGESTIONS.map((s,i) => (
              <button key={i} onClick={() => send(s)}
                className="w-full text-left text-xs font-mono text-text-secondary hover:text-text-primary bg-card/50 hover:bg-card border border-border hover:border-accent/20 rounded-lg px-2.5 py-2 transition-all">
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={clsx('flex gap-2', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            <div className={clsx('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] font-bold',
              msg.role === 'user' ? 'bg-accent/15 text-accent border border-accent/20' : 'bg-purple/15 text-purple border border-purple/20')}>
              {msg.role === 'user' ? 'U' : 'AI'}
            </div>
            <div className={clsx('max-w-[85%] rounded-xl px-3 py-2.5',
              msg.role === 'user' ? 'bg-accent/10 border border-accent/15' : 'bg-card border border-border')}>
              <div className="text-[9px] font-mono text-text-secondary mb-1.5">{msg.role === 'user' ? 'You' : 'DCIM AI'} · {format(msg.ts,'HH:mm:ss')}</div>
              <Markdown text={msg.content} />
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-purple/15 border border-purple/20 flex items-center justify-center text-[9px] font-bold text-purple">AI</div>
            <div className="bg-card border border-border rounded-xl px-3 py-2.5 flex items-center gap-2">
              <span className="text-xs font-mono text-text-secondary">Analysing</span>
              {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
            </div>
          </div>
        )}
        <div ref={(el) => { if (el) bottomRef.current = el }} />
      </div>

      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Ask about infrastructure…" className="input flex-1 resize-none text-xs h-14 py-2" disabled={thinking} />
          <button onClick={() => send()} disabled={!input.trim() || thinking}
            className="btn-primary px-3 self-end h-10 text-xs disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
