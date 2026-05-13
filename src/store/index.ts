import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getLiveKPIs, getLiveRacks, generateAlerts, engineTick, updateConfig, type PlatformConfig, CFG } from '../data/engine'

function _uid() {
  try { if (crypto?.randomUUID) return crypto.randomUUID() } catch {}
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ── KPI Store ─────────────────────────────────────────────────────────────────
export const useKPIStore = create<{ kpis: any; updated: Date | null; setKPIs: (k: any) => void }>((set) => ({
  kpis: getLiveKPIs(), updated: new Date(),
  setKPIs: (kpis) => set({ kpis, updated: new Date() }),
}))

// ── Rack Store ────────────────────────────────────────────────────────────────
export const useRackStore = create<{ racks: any[]; setRacks: (r: any[]) => void }>((set) => ({
  racks: getLiveRacks(), setRacks: (racks) => set({ racks }),
}))

// ── Alert Store ───────────────────────────────────────────────────────────────
export const useAlertStore = create<{
  alerts: any[]; unackedCount: number
  setAlerts: (a: any[]) => void; addAlert: (a: any) => void
  ack: (id: string) => void; dismiss: (id: string) => void
}>((set) => ({
  alerts: generateAlerts(18), unackedCount: 12,
  setAlerts: (alerts) => set({ alerts, unackedCount: alerts.filter((a: any) => !a.acknowledged).length }),
  addAlert: (alert) => set(s => ({ alerts: [alert, ...s.alerts].slice(0, 300), unackedCount: s.unackedCount + 1 })),
  ack: (id) => set(s => ({ alerts: s.alerts.map((a: any) => a.id === id ? { ...a, acknowledged: true } : a), unackedCount: Math.max(0, s.unackedCount - 1) })),
  dismiss: (id) => set(s => ({ alerts: s.alerts.filter((a: any) => a.id !== id), unackedCount: s.alerts.find((a: any) => a.id === id && !a.acknowledged) ? Math.max(0, s.unackedCount - 1) : s.unackedCount })),
}))

// ── Auth Store ────────────────────────────────────────────────────────────────
export interface User { id: string; email: string; full_name: string; role: 'super_admin'|'admin'|'operator'|'viewer'; is_active: boolean; last_login?: string; mfa_enabled?: boolean; created_at: string }
export interface AuditEntry { id: string; ts: string; user: string; action: string; resource: string; severity: 'info'|'warning'|'critical'; details?: string }

export const useAuthStore = create<{
  user: User | null; token: string | null
  loginAttempts: number; lockedUntil: number | null
  auditLog: AuditEntry[]
  setAuth: (u: User, t: string) => void; clearAuth: () => void
  addAudit: (e: Omit<AuditEntry,'id'|'ts'>) => void
  incAttempts: () => void; resetAttempts: () => void
}>()(persist(
  (set, get) => ({
    user: null, token: null, loginAttempts: 0, lockedUntil: null, auditLog: [],
    setAuth: (user, token) => {
      const e: AuditEntry = { id: _uid(), ts: new Date().toISOString(), user: user.email, action: 'LOGIN_SUCCESS', resource: 'auth', severity: 'info', details: `Role: ${user.role}` }
      set(s => ({ user: { ...user, last_login: new Date().toISOString() }, token, loginAttempts: 0, lockedUntil: null, auditLog: [e, ...s.auditLog].slice(0,500) }))
    },
    clearAuth: () => {
      const u = get().user
      const e: AuditEntry = { id: _uid(), ts: new Date().toISOString(), user: u?.email ?? 'unknown', action: 'LOGOUT', resource: 'auth', severity: 'info' }
      set(s => ({ user: null, token: null, auditLog: [e, ...s.auditLog].slice(0,500) }))
    },
    addAudit: (entry) => set(s => ({ auditLog: [{ ...entry, id: _uid(), ts: new Date().toISOString() }, ...s.auditLog].slice(0,500) })),
    incAttempts: () => set(s => {
      const a = s.loginAttempts + 1
      return { loginAttempts: a, lockedUntil: a >= 5 ? Date.now() + 15 * 60 * 1000 : null }
    }),
    resetAttempts: () => set({ loginAttempts: 0, lockedUntil: null }),
  }),
  { name: 'dcim-auth', partialize: s => ({ auditLog: s.auditLog }) }
))

// ── Users Store ───────────────────────────────────────────────────────────────
export const useUsersStore = create<{ users: User[]; addUser: (u: User) => void; updateUser: (id: string, p: Partial<User>) => void; deleteUser: (id: string) => void }>()(persist(
  (set) => ({
    users: [
      { id:'1', email:'admin@dvt.io', full_name:'Platform Administrator', role:'super_admin', is_active:true, created_at:'2024-01-01', mfa_enabled:true },
      { id:'2', email:'ops@dvt.io', full_name:'Operations Engineer', role:'operator', is_active:true, created_at:'2024-01-01', mfa_enabled:false },
      { id:'3', email:'viewer@dvt.io', full_name:'Read Only User', role:'viewer', is_active:true, created_at:'2024-01-01', mfa_enabled:false },
      { id:'4', email:'security@dvt.io', full_name:'Security Analyst', role:'admin', is_active:true, created_at:'2024-01-15', mfa_enabled:true },
    ],
    addUser: (u) => set(s => ({ users: [...s.users, u] })),
    updateUser: (id, p) => set(s => ({ users: s.users.map(u => u.id === id ? { ...u, ...p } : u) })),
    deleteUser: (id) => set(s => ({ users: s.users.filter(u => u.id !== id) })),
  }),
  { name: 'dcim-users' }
))

// ── Config Store ──────────────────────────────────────────────────────────────
export const useConfigStore = create<{ cfg: PlatformConfig; update: (p: Partial<PlatformConfig>) => void; reset: () => void }>()(persist(
  (set) => ({
    cfg: { ...CFG },
    update: (patch) => { updateConfig(patch); set(s => ({ cfg: { ...s.cfg, ...patch } })) },
    reset: () => { updateConfig(CFG); set({ cfg: { ...CFG } }) },
  }),
  { name: 'dcim-config' }
))

// ── Incident Store ────────────────────────────────────────────────────────────
import { INCIDENTS } from '../data/engine'
export const useIncidentStore = create<{
  incidents: any[]; addIncident: (i: any) => void; updateIncident: (id: string, p: any) => void
}>()(persist(
  (set) => ({
    incidents: INCIDENTS,
    addIncident: (i) => set(s => ({ incidents: [i, ...s.incidents] })),
    updateIncident: (id, p) => set(s => ({ incidents: s.incidents.map(i => i.id === id ? { ...i, ...p } : i) })),
  }),
  { name: 'dcim-incidents' }
))

// ── AI Store ──────────────────────────────────────────────────────────────────
export interface AIMessage { id: string; role: 'user'|'assistant'; content: string; ts: Date; thinking?: boolean }
export const useAIStore = create<{ messages: AIMessage[]; thinking: boolean; add: (m: AIMessage) => void; setThinking: (v: boolean) => void; clear: () => void }>((set) => ({
  messages: [], thinking: false,
  add: (m) => set(s => ({ messages: [...s.messages, m] })),
  setThinking: (thinking) => set({ thinking }),
  clear: () => set({ messages: [] }),
}))

// ── Notification Store ────────────────────────────────────────────────────────
export const useNotifStore = create<{ count: number; inc: () => void; reset: () => void }>((set) => ({
  count: 0, inc: () => set(s => ({ count: s.count + 1 })), reset: () => set({ count: 0 }),
}))

// ── Live Ticker ───────────────────────────────────────────────────────────────
let _ticker: ReturnType<typeof setInterval> | null = null
export function startTicker() {
  if (_ticker) return
  _ticker = setInterval(() => {
    engineTick()
    useKPIStore.getState().setKPIs(getLiveKPIs())
    useRackStore.getState().setRacks(getLiveRacks())
    if (Math.random() < 0.05) {
      const [a] = generateAlerts(1)
      a.id = `live-${Date.now()}`; a.acknowledged = false; a.created_at = new Date().toISOString()
      useAlertStore.getState().addAlert(a)
      useNotifStore.getState().inc()
    }
  }, 5000)
}
