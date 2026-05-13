import React, { useState as _useState } from 'react'
import clsx from 'clsx'
import { X, AlertTriangle, CheckCircle, Info, Loader2 } from 'lucide-react'

// ── Severity Badge ────────────────────────────────────────────────────────────
export function Severity({ sev, children }: { sev: string; children?: React.ReactNode }) {
  return <span className={`badge-${sev} badge`}>{children ?? sev}</span>
}

// ── Status Dot ────────────────────────────────────────────────────────────────
export function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    online: 'bg-success', normal: 'bg-success', pass: 'bg-success',
    warning: 'bg-warning', warn: 'bg-warning', investigating: 'bg-warning',
    critical: 'bg-critical', offline: 'bg-text-secondary', maintenance: 'bg-purple',
    resolved: 'bg-success/40', open: 'bg-critical',
  }
  return <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', colors[status] ?? 'bg-text-secondary')} />
}

// ── Button ────────────────────────────────────────────────────────────────────
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary'|'secondary'|'danger'
  size?: 'sm'|'md'
  loading?: boolean
}
export function Btn({ variant='secondary', size='md', loading, children, className, disabled, ...p }: BtnProps) {
  return (
    <button className={clsx(
      variant === 'primary' ? 'btn-primary' : variant === 'danger' ? 'btn-danger' : 'btn-secondary',
      size === 'sm' ? 'btn-sm' : '',
      loading && 'cursor-wait', className
    )} disabled={disabled || loading} {...p}>
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width='max-w-lg' }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: string }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx('relative bg-card border border-border rounded-2xl shadow-2xl w-full overflow-hidden', width)}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-mono text-sm font-bold text-text-primary">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-surface rounded-lg transition-colors"><X className="w-4 h-4 text-text-secondary" /></button>
        </div>
        <div className="p-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

// ── Loader ────────────────────────────────────────────────────────────────────
export function Loader({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
      {text && <span className="text-xs font-mono text-text-secondary">{text}</span>}
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function Empty({ msg, icon }: { msg: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      {icon && <div className="text-text-secondary/20">{icon}</div>}
      <p className="text-sm font-mono text-text-secondary">{msg}</p>
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
export function KPICard({ label, value, unit, icon, status='normal', sub, trend }: { label: string; value: string|number; unit?: string; icon?: React.ReactNode; status?: string; sub?: string; trend?: number }) {
  const vc = status === 'critical' ? 'text-critical' : status === 'warning' ? 'text-warning' : status === 'good' ? 'text-success' : 'text-text-primary'
  return (
    <div className="card flex flex-col gap-2 hover:glow-accent transition-all">
      <div className="flex items-center justify-between">
        <span className="section-title mb-0">{label}</span>
        {icon && <div className="text-text-secondary">{icon}</div>}
      </div>
      <div className="flex items-end gap-1.5">
        <span className={clsx('kpi-value', vc)}>{value}</span>
        {unit && <span className="text-xs font-mono text-text-secondary mb-0.5">{unit}</span>}
        {trend !== undefined && (
          <span className={clsx('text-xs font-mono ml-auto mb-0.5', trend > 0 ? 'text-critical' : 'text-success')}>
            {trend > 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      {sub && <span className="text-[11px] font-mono text-text-secondary">{sub}</span>}
    </div>
  )
}

// ── Page Header ───────────────────────────────────────────────────────────────
export function PageHeader({ title, sub, crumbs, actions, updated }: { title: string; sub?: string; crumbs?: string[]; actions?: React.ReactNode; updated?: Date|null }) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4">
      <div>
        {crumbs && (
          <div className="flex items-center gap-1.5 text-xs font-mono text-text-secondary mb-1">
            {crumbs.map((b,i) => <span key={i} className="flex items-center gap-1.5">{i>0&&<span className="text-text-muted">/</span>}<span>{b}</span></span>)}
          </div>
        )}
        <h1 className="page-title">{title}</h1>
        {sub && <p className="text-text-secondary text-sm mt-1">{sub}</p>}
        {updated && <p className="text-[11px] font-mono text-text-secondary/40 mt-1">Updated {updated.toLocaleTimeString()}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap flex-shrink-0">{actions}</div>}
    </div>
  )
}

// ── Callout ───────────────────────────────────────────────────────────────────
export function Callout({ type='info', children }: { type?: 'info'|'warning'|'critical'|'success'; children: React.ReactNode }) {
  const styles = { info:'border-accent/30 bg-accent/5 text-accent', warning:'border-warning/30 bg-warning/5 text-warning', critical:'border-critical/30 bg-critical/5 text-critical', success:'border-success/30 bg-success/5 text-success' }
  const icons = { info:<Info className="w-4 h-4"/>, warning:<AlertTriangle className="w-4 h-4"/>, critical:<AlertTriangle className="w-4 h-4"/>, success:<CheckCircle className="w-4 h-4"/> }
  return (
    <div className={clsx('flex items-start gap-3 border rounded-xl px-4 py-3 text-sm font-mono', styles[type])}>
      <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
export function ProgressBar({ value, max=100, label, colorClass='bg-accent', showPct=true, h='h-2' }: { value: number; max?: number; label?: string; colorClass?: string; showPct?: boolean; h?: string }) {
  const pct = Math.min(100, (value / max) * 100)
  const color = pct > 90 ? 'bg-critical' : pct > 75 ? 'bg-warning' : colorClass
  return (
    <div className="space-y-1">
      {(label || showPct) && (
        <div className="flex justify-between text-xs font-mono text-text-secondary">
          {label && <span>{label}</span>}
          {showPct && <span>{pct.toFixed(0)}%</span>}
        </div>
      )}
      <div className={clsx('bg-border rounded-full overflow-hidden', h)}>
        <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string; icon?: React.ReactNode; badge?: number }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex gap-0.5 border-b border-border overflow-x-auto">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={clsx('flex items-center gap-2 px-4 py-2.5 text-xs font-mono border-b-2 transition-all whitespace-nowrap flex-shrink-0',
            active === t.id ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary')}>
          {t.icon}{t.label}
          {t.badge !== undefined && t.badge > 0 && (
            <span className="bg-critical text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{t.badge > 99 ? '99+' : t.badge}</span>
          )}
        </button>
      ))}
    </div>
  )
}

// ── Simple Markdown renderer ──────────────────────────────────────────────────
export function Markdown({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-1.5 text-xs font-mono">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <h2 key={i} className="text-sm font-bold text-text-primary mt-2 mb-1">{line.slice(3)}</h2>
        if (line.startsWith('### ')) return <h3 key={i} className="text-xs font-bold text-text-primary mt-1.5">{line.slice(4)}</h3>
        if (line.startsWith('| ') && line.includes(' | ')) {
          const cells = line.split('|').filter(c => c.trim())
          const isHeader = i < lines.length - 1 && lines[i+1]?.match(/^\|[-| ]+\|$/)
          const isSep = line.match(/^\|[-| ]+\|$/)
          if (isSep) return null
          return <div key={i} className={clsx('grid gap-2 py-1 border-b border-border/50', `grid-cols-${Math.min(cells.length, 4)}`)}>
            {cells.map((c,j) => <span key={j} className={isHeader ? 'text-text-secondary font-bold' : 'text-text-primary'} dangerouslySetInnerHTML={{__html: c.trim().replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/`(.*?)`/g,'<code class="bg-surface rounded px-1 text-accent">$1</code>')}} />)}
          </div>
        }
        if (line.startsWith('- ') || line.startsWith('* ')) return <div key={i} className="flex gap-2"><span className="text-accent flex-shrink-0">·</span><span dangerouslySetInnerHTML={{__html: line.slice(2).replace(/\*\*(.*?)\*\*/g,'<strong class="text-text-primary">$1</strong>').replace(/`(.*?)`/g,'<code class="bg-surface rounded px-1 text-accent">$1</code>')}} /></div>
        if (line.match(/^\d+\. /)) return <div key={i} className="flex gap-2"><span className="text-accent flex-shrink-0 w-4">{line.match(/^\d+/)?.[0]}.</span><span dangerouslySetInnerHTML={{__html: line.replace(/^\d+\. /,'').replace(/\*\*(.*?)\*\*/g,'<strong class="text-text-primary">$1</strong>').replace(/`(.*?)`/g,'<code class="bg-surface rounded px-1 text-accent">$1</code>')}} /></div>
        if (line === '' || line === '---') return <div key={i} className={line === '---' ? 'border-t border-border my-2' : 'h-1'} />
        if (line.startsWith('```')) return null
        return <p key={i} className="text-text-secondary leading-relaxed" dangerouslySetInnerHTML={{__html: line.replace(/\*\*(.*?)\*\*/g,'<strong class="text-text-primary">$1</strong>').replace(/`(.*?)`/g,'<code class="bg-surface rounded px-1 text-accent">$1</code>').replace(/⚠️|🔴|✅|⚡|🌡️|❄️|🌱|🎯|💥|💰|🤖|📋|🔒|🔧/g,'<span class="mr-1">$&</span>')}} />
      })}
    </div>
  )
}

// ── Simple Tabs (string labels + children array) ───────────────────────────────
export function SimpleTabs({ tabs, children }: { tabs: string[]; children: React.ReactNode[] }) {
  const [active, setActive] = React.useState(0)
  return (
    <div>
      <div className="flex gap-0.5 border-b border-border overflow-x-auto mb-5">
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setActive(i)}
            className={clsx('px-4 py-2.5 text-xs font-mono border-b-2 transition-all whitespace-nowrap flex-shrink-0',
              active === i ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary')}>
            {t}
          </button>
        ))}
      </div>
      {children[active]}
    </div>
  )
}
