import { useState } from 'react'
import { getPredictions } from '../data/engine'
import { PageHeader, Severity, Empty, KPICard } from '../components/shared'
import { TrendingUp, Shield, Clock } from 'lucide-react'
import { format, addMinutes } from 'date-fns'
import clsx from 'clsx'

const TYPE_COLOR: Record<string,string> = { psu_failure:'text-critical', cooling_degradation:'text-warning', rack_overload:'text-orange-400', battery_deterioration:'text-yellow-400', network_congestion:'text-accent', thermal_runaway:'text-red-300' }
const MODEL_BADGE: Record<string,string> = { 'LSTM-v3':'bg-purple/20 text-purple','Prophet-v2':'bg-accent/20 text-accent','IsolationForest':'bg-warning/20 text-warning','GradientBoost':'bg-success/20 text-success','Transformer-v1':'bg-pink-500/20 text-pink-400' }

export default function PredictiveAI() {
  const [preds] = useState(()=>getPredictions())
  const [sev, setSev] = useState('all')
  const [sort, setSort] = useState<'confidence_pct'|'time_horizon_min'>('confidence_pct')

  const filtered = preds.filter(p=>sev==='all'||p.severity===sev).sort((a,b)=>sort==='confidence_pct'?b.confidence_pct-a.confidence_pct:a.time_horizon_min-b.time_horizon_min)
  const critical = preds.filter(p=>p.severity==='critical').length
  const high = preds.filter(p=>p.severity==='high').length
  const avgConf = +(preds.reduce((s,p)=>s+p.confidence_pct,0)/preds.length).toFixed(1)

  return (
    <div className="space-y-5">
      <PageHeader title="Predictive AI" sub="Machine learning failure forecasting — LSTM, Prophet, Transformer, Isolation Forest models" crumbs={['DCIM','Predictive AI']}/>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Active Predictions" value={preds.length} icon={<TrendingUp className="w-4 h-4"/>}/>
        <KPICard label="Critical Risk" value={critical} icon={<Shield className="w-4 h-4"/>} status={critical>0?'critical':'good'}/>
        <KPICard label="High Risk" value={high} icon={<Shield className="w-4 h-4"/>} status={high>0?'warning':'good'}/>
        <KPICard label="Avg Confidence" value={`${avgConf}%`} icon={<TrendingUp className="w-4 h-4"/>} status="good"/>
      </div>

      <div className="card">
        <div className="section-title">Top Risks — Click a prediction for details</div>
        <div className="space-y-2.5 mb-4">
          {filtered.slice(0,5).map((p,i)=>(
            <div key={p.id} className="flex items-center gap-4 p-3 bg-surface rounded-xl border border-border">
              <div className="font-mono text-xl font-bold text-text-muted w-8">#{i+1}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="font-mono text-sm font-bold text-text-primary">{p.rack_label}</span>
                  <Severity sev={p.severity}/>
                  <span className={clsx('text-xs font-mono', TYPE_COLOR[p.prediction_type])}>{p.type_label}</span>
                  <span className={clsx('text-[9px] font-mono rounded px-1.5 py-0.5', MODEL_BADGE[p.model]||'bg-surface text-text-secondary')}>{p.model}</span>
                </div>
                <p className="text-xs font-mono text-text-secondary truncate">{p.recommended_action}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-mono text-lg font-bold text-text-primary">{p.confidence_pct.toFixed(0)}%</div>
                <div className="text-[10px] font-mono text-text-secondary">{p.time_horizon_min<60?`${p.time_horizon_min}m`:`${Math.round(p.time_horizon_min/60)}h`}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <select value={sev} onChange={e=>setSev(e.target.value)} className="input text-xs py-1.5">
            <option value="all">All Severities</option>
            {['critical','high','medium','low'].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <select value={sort} onChange={e=>setSort(e.target.value as any)} className="input text-xs py-1.5">
            <option value="confidence_pct">Sort: Confidence</option>
            <option value="time_horizon_min">Sort: Time Horizon</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead><tr className="text-text-secondary border-b border-border text-[10px]">
              <th className="text-left pb-2 pr-3">Component</th><th className="text-left pb-2 pr-3">Prediction</th>
              <th className="text-left pb-2 pr-3">Severity</th><th className="text-left pb-2 pr-3">Model</th>
              <th className="text-right pb-2 pr-3">Confidence</th><th className="text-right pb-2 pr-3">Horizon</th>
              <th className="text-right pb-2">Predicted Event</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {filtered.map(p=>(
                <tr key={p.id} className="hover:bg-surface/50">
                  <td className="py-2 pr-3 font-bold text-text-primary">{p.rack_label}</td>
                  <td className={clsx('py-2 pr-3 font-bold', TYPE_COLOR[p.prediction_type])}>{p.type_label}</td>
                  <td className="py-2 pr-3"><Severity sev={p.severity}/></td>
                  <td className="py-2 pr-3"><span className={clsx('text-[9px] rounded px-1.5 py-0.5', MODEL_BADGE[p.model]||'bg-surface text-text-secondary')}>{p.model}</span></td>
                  <td className="py-2 pr-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden"><div className="h-full rounded-full bg-accent" style={{width:`${p.confidence_pct}%`}}/></div>
                      <span className="font-bold w-8">{p.confidence_pct.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-right text-text-secondary">{p.time_horizon_min<60?`${p.time_horizon_min}m`:`${Math.round(p.time_horizon_min/60)}h`}</td>
                  <td className="py-2 text-right text-text-secondary">{format(addMinutes(new Date(),p.time_horizon_min),'MMM d HH:mm')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
