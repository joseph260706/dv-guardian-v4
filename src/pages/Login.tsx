import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Eye, EyeOff, Lock, Shield } from 'lucide-react'
import { useAuthStore, useUsersStore } from '../store'
import { useConfigStore } from '../store'
import toast from 'react-hot-toast'

const DEMO_PASSWORDS: Record<string,string> = {
  'admin@dvt.io': 'Admin2025!', 'ops@dvt.io': 'Operator2025!',
  'viewer@dvt.io': 'Viewer2025!', 'security@dvt.io': 'Security2025!',
}

export default function Login() {
  const [email, setEmail] = useState('admin@dvt.io')
  const [pw, setPw] = useState('Admin2025!')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const { setAuth, loginAttempts, lockedUntil, incAttempts, resetAttempts, addAudit } = useAuthStore()
  const { users } = useUsersStore()
  const { cfg } = useConfigStore()
  const navigate = useNavigate()

  const isLocked = !!(lockedUntil && Date.now() < lockedUntil)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLocked) { toast.error('Account locked. Try again in 15 minutes.'); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400))
    const user = users.find(u => u.email === email && u.is_active)
    if (user && DEMO_PASSWORDS[email] === pw) {
      resetAttempts()
      setAuth(user, `dcim-token-${user.role}-${Date.now()}`)
      navigate('/')
    } else {
      incAttempts()
      addAudit({ user: email, action: 'LOGIN_FAILED', resource: 'auth', severity: 'warning', details: `Attempt ${loginAttempts+1}` })
      toast.error(user ? `Invalid password — ${4-loginAttempts} attempts remaining` : 'User not found or account inactive')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(#00d4ff 1px, transparent 1px), linear-gradient(90deg, #00d4ff 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent/10 border border-accent/20 rounded-2xl mb-4 glow-accent">
            <Zap className="w-7 h-7 text-accent" />
          </div>
          <h1 className="font-mono text-2xl font-bold text-text-primary">DCIM Platform</h1>
          <p className="text-text-secondary text-sm font-mono mt-1">Enterprise Infrastructure Intelligence</p>
          <p className="text-text-muted text-xs font-mono mt-0.5">{cfg.orgName} · {cfg.dcName}</p>
        </div>

        {isLocked && (
          <div className="mb-4 flex items-center gap-2 bg-critical/10 border border-critical/30 rounded-xl px-4 py-3">
            <Lock className="w-4 h-4 text-critical" />
            <p className="text-xs font-mono text-critical">Account locked after 5 failed attempts. Wait 15 minutes.</p>
          </div>
        )}

        <div className="card border-border/50 glow-accent">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-text-secondary mb-1.5 uppercase tracking-wider">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input w-full" disabled={isLocked} required />
            </div>
            <div>
              <label className="block text-xs font-mono text-text-secondary mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} className="input w-full pr-10" disabled={isLocked} required />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {loginAttempts > 0 && !isLocked && <p className="text-xs font-mono text-warning">{5-loginAttempts} attempts remaining before lockout</p>}
            <button type="submit" disabled={loading || isLocked} className="btn-primary w-full justify-center py-2.5 mt-2">
              {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />Authenticating…</span> : <><Shield className="w-4 h-4" />Sign In</>}
            </button>
          </form>
        </div>

        {/* Demo creds */}
        <div className="mt-4 p-3 bg-surface/60 border border-border rounded-xl">
          <p className="text-[10px] font-mono text-text-secondary text-center mb-2 uppercase tracking-wider">Demo Credentials — Click to fill</p>
          <div className="space-y-1">
            {[
              { email:'admin@dvt.io', pw:'Admin2025!', role:'super_admin', color:'text-purple' },
              { email:'ops@dvt.io', pw:'Operator2025!', role:'operator', color:'text-warning' },
              { email:'security@dvt.io', pw:'Security2025!', role:'admin', color:'text-accent' },
              { email:'viewer@dvt.io', pw:'Viewer2025!', role:'viewer', color:'text-text-secondary' },
            ].map(u => (
              <button key={u.email} onClick={() => { setEmail(u.email); setPw(u.pw) }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-card transition-colors flex items-center gap-3 text-[11px] font-mono">
                <span className={clsx('font-bold w-20 flex-shrink-0', u.color)}>{u.role}</span>
                <span className="text-text-secondary">{u.email}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-[10px] font-mono text-text-muted/40 mt-6">
          Tier {cfg.dcTier} · {cfg.dcLocation} · v4.0 Production
        </p>
      </div>
    </div>
  )
}

function clsx(...args: any[]) { return args.filter(Boolean).join(' ') }
