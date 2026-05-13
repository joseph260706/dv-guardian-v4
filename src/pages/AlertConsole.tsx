import { useState } from 'react'
import { AlertTriangle, Filter, CheckCircle, X, Eye, RefreshCw } from 'lucide-react'
import { useAlertStore } from '../store'
import { PageHeader, Severity, Btn, Tabs, Empty } from '../components/shared'
import { format, formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const SYSTEMS = ['all','cooling','power','compute','network','security']

export default function AlertConsole() {
  const { alerts, ack, dismiss, setAlerts } = useAlertStore()
  const [sev, setSev] = useState('all')
  const [sys, setSys] = useState('all')
  const [tab, setTab] = useState('active')
  const [selected, setSelected] = useState<any>(null)

  const filtered = alerts.filter((a: any) => {
    if (tab === 'active' && a.acknowledged) return false
    if (tab === 'acknowledged' && !a.acknowledged) return false
    if (sev !== 'all' && a.severity !== sev) return false
    if (sys !== 'all' && a.system !== sys) return false
    return true
  })

  const counts = { critical: alerts.filter((a: any) => !a.acknowledged && a.severity === 'critical').length, high: alerts.filter((a: any) => !a.acknowledged && a.severity === 'high').length }

  const ackAll = () => { alerts.filter((a: any) => !a.acknowledged && a.severity !== 'critical').forEach((a: any) => ack(a.id)); toast.success('All non-critical alerts acknowledged') }

  return (
    <div className="space-y-5">
      <PageHeader title="Alert Console" sub="Real-time operational alerts with AI correlation and root cause analysis" crumbs={['DCIM','Alerts']}
        actions={<div className="flex gap-2"><Btn variant="secondary" size="sm" onClick={ackAll}><CheckCircle className="w-3.5 h-3.5"/>Ack All Non-Critical</Btn></div>} />

      <div className="grid grid-cols-4 gap-3">
        {[{l:'Critical',v:counts.critical,c:'text-critical'},{l:'High',v:counts.high,c:'text-warning'},{l:'Total Unacked',v:alerts.filter((a:any)=>!a.acknowledged).length,c:'text-accent'},{l:'Total Alerts',v:alerts.length,c:'text-text-primary'}].map(({l,v,c})=>(
          <div key={l} className="card text-center"><div className={clsx('font-mono text-3xl font-bold',c)}>{v}</div><div className="text-xs font-mono text-text-secondary mt-1">{l}</div></div>
        ))}
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Tabs tabs={[{id:'active',label:'Active',badge:alerts.filter((a:any)=>!a.acknowledged).length},{id:'acknowledged',label:'Acknowledged'},{id:'all',label:'All'}]} active={tab} onChange={setTab} />
          <div className="flex gap-2 ml-auto">
            <select value={sev} onChange={e=>setSev(e.target.value)} className="input text-xs py-1">
              <option value="all">All Severities</option>
              {['critical','high','medium','low'].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <select value={sys} onChange={e=>setSys(e.target.value)} className="input text-xs py-1">
              {SYSTEMS.map(s=><option key={s} value={s}>{s==='all'?'All Systems':s}</option>)}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? <Empty msg="No alerts match current filters" icon={<CheckCircle className="w-10 h-10"/>}/> : (
          <div className="space-y-2">
            {filtered.map((a: any) => (
              <div key={a.id} className={clsx('border rounded-xl p-3 transition-all',
                a.severity==='critical'?'border-critical/25 bg-critical/5 alert-pulse':a.severity==='high'?'border-warning/25 bg-warning/5':'border-border bg-surface/30',
                selected?.id===a.id&&'ring-1 ring-accent/40'
              )}>
                <div className="flex items-start gap-3">
                  <Severity sev={a.severity}/>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-mono text-sm font-bold text-text-primary leading-tight">{a.title}</div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={()=>setSelected(selected?.id===a.id?null:a)} className="p-1.5 rounded hover:bg-card transition-colors"><Eye className="w-3.5 h-3.5 text-text-secondary"/></button>
                        {!a.acknowledged&&<button onClick={()=>{ack(a.id);toast.success('Acknowledged')}} className="p-1.5 rounded hover:bg-card transition-colors"><CheckCircle className="w-3.5 h-3.5 text-success"/></button>}
                        <button onClick={()=>{dismiss(a.id);toast.success('Dismissed')}} className="p-1.5 rounded hover:bg-card transition-colors"><X className="w-3.5 h-3.5 text-critical"/></button>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-1 text-[10px] font-mono text-text-secondary">
                      <span className="text-accent">{a.source}</span>
                      <span>{a.system}</span>
                      <span>{formatDistanceToNow(new Date(a.created_at),{addSuffix:true})}</span>
                      {a.time_to_impact_min&&<span className="text-critical font-bold">Impact in {a.time_to_impact_min}min</span>}
                      <span className="ml-auto">AI Confidence: {a.confidence_pct}%</span>
                    </div>
                    {selected?.id===a.id&&(
                      <div className="mt-3 space-y-2 border-t border-border pt-3">
                        <div><div className="text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-1">Probable Cause</div><p className="text-xs font-mono text-text-primary">{a.probable_cause}</p></div>
                        <div><div className="text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-1">Recommended Action</div><p className="text-xs font-mono text-accent">{a.recommended_action}</p></div>
                        {a.correlated_alerts>0&&<div className="text-[10px] font-mono text-purple">Correlated with {a.correlated_alerts} other alerts in same impact zone</div>}
                        <div className="text-[10px] font-mono text-text-secondary">Estimated MTTR: {a.estimated_mttr_min} minutes</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
