import { useState, useEffect } from 'react'
import { useRackStore } from '../store'
import { HALLS, RACKS, DEVICES, getRackTelemetry } from '../data/engine'
import { PageHeader, KPICard, ProgressBar, Severity, Empty } from '../components/shared'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Server, Thermometer, Zap, Cpu } from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'

const CS = { fontSize:9, fontFamily:'JetBrains Mono', fill:'#64748b' }
const TS = { backgroundColor:'#161b27', border:'1px solid #1e2d45', fontFamily:'JetBrains Mono', fontSize:10, borderRadius:8 }

export default function RackAnalytics() {
  const { racks } = useRackStore()
  const [hallId, setHallId] = useState(HALLS[0].id)
  const [rackId, setRackId] = useState('')
  const [telemetry, setTelemetry] = useState<any[]>([])

  const hallRacks = racks.filter((r:any)=>r.hall_id===hallId)
  const rack = racks.find((r:any)=>r.id===rackId) as any
  const devices = DEVICES.filter(d=>d.rack_id===rackId)

  useEffect(()=>{ if(rackId) setTelemetry(getRackTelemetry(rackId,24)) },[rackId])

  const critCount = racks.filter((r:any)=>r.status==='critical').length
  const warnCount = racks.filter((r:any)=>r.status==='warning').length
  const totalPower = +racks.reduce((s:number,r:any)=>s+r.power_used_kw,0).toFixed(1)

  return (
    <div className="space-y-5">
      <PageHeader title="Rack Analytics" sub="Per-rack telemetry, device inventory, thermal monitoring and power analytics" crumbs={['DCIM','Rack Analytics']} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Total Racks" value={RACKS.length} icon={<Server className="w-4 h-4"/>}/>
        <KPICard label="Critical" value={critCount} icon={<Thermometer className="w-4 h-4"/>} status={critCount>0?'critical':'good'}/>
        <KPICard label="Warning" value={warnCount} icon={<Thermometer className="w-4 h-4"/>} status={warnCount>3?'warning':'good'}/>
        <KPICard label="Total Rack Power" value={totalPower} unit="kW" icon={<Zap className="w-4 h-4"/>}/>
      </div>

      <div className="flex gap-3">
        <div><label className="text-xs font-mono text-text-secondary block mb-1">Hall</label>
          <select value={hallId} onChange={e=>{setHallId(e.target.value);setRackId('')}} className="input">
            {HALLS.map(h=><option key={h.id} value={h.id}>{h.name} ({h.cooling})</option>)}
          </select>
        </div>
        <div><label className="text-xs font-mono text-text-secondary block mb-1">Rack</label>
          <select value={rackId} onChange={e=>setRackId(e.target.value)} className="input">
            <option value="">Select rack…</option>
            {hallRacks.map((r:any)=><option key={r.id} value={r.id}>{r.label} · {r.temp_c}°C · {r.status}</option>)}
          </select>
        </div>
      </div>

      {!rackId ? (
        <div className="card">
          <div className="section-title">Hall Floor — Click a rack to drill in</div>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
            {hallRacks.map((r:any)=>(
              <button key={r.id} onClick={()=>setRackId(r.id)}
                className={clsx('p-2 rounded-lg border text-center transition-all hover:scale-105',
                  r.status==='critical'?'border-critical/50 bg-critical/10':r.status==='warning'?'border-warning/50 bg-warning/10':'border-border bg-surface hover:border-accent/30')}>
                <div className="font-mono text-xs font-bold text-text-primary">{r.label}</div>
                <div className={clsx('text-xs font-mono mt-0.5',r.temp_c>35?'text-critical':r.temp_c>30?'text-warning':'text-success')}>{r.temp_c}°C</div>
                <div className="text-[9px] font-mono text-text-secondary">{r.power_used_kw?.toFixed(1)}kW</div>
              </button>
            ))}
          </div>
        </div>
      ) : rack && (
        <div className="space-y-4">
          <div className="card flex items-center gap-6 flex-wrap">
            <div><div className="font-mono text-3xl font-bold text-text-primary">{rack.label}</div><div className="text-xs font-mono text-text-secondary">42U Data Rack · {HALLS.find(h=>h.id===rack.hall_id)?.name}</div></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-1">
              {[{l:'Temperature',v:`${rack.temp_c}°C`,c:rack.temp_c>35?'text-critical':rack.temp_c>30?'text-warning':'text-success'},
                {l:'Power Used',v:`${rack.power_used_kw?.toFixed(1)} kW`},{l:'Power Budget',v:`${rack.power_cap_kw?.toFixed(1)} kW`},{l:'Devices',v:devices.length}].map(({l,v,c})=>(
                <div key={l}><div className="text-xs font-mono text-text-secondary">{l}</div><div className={clsx('font-mono text-lg font-bold',c||'text-text-primary')}>{v}</div></div>
              ))}
            </div>
            <div className="w-40"><ProgressBar value={rack.power_used_kw} max={rack.power_cap_kw} label="Power Budget"/></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card">
              <div className="section-title">Device Inventory ({devices.length})</div>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {devices.sort((a:any,b:any)=>a.slot-b.slot).map((d:any)=>(
                  <div key={d.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-surface/50 text-xs font-mono">
                    <span className={clsx('w-2 h-2 rounded-full flex-shrink-0',d.status==='online'?'bg-success':'bg-critical')}/>
                    <span className="text-text-primary truncate flex-1">{d.spec?.model??'Unknown'}</span>
                    <span className={clsx('text-[9px] border rounded px-1 py-0.5',
                      d.spec?.cat==='gpu'?'border-purple/30 text-purple':d.spec?.cat==='switch'?'border-success/30 text-success':'border-border text-text-secondary')}>
                      {d.spec?.cat?.toUpperCase()??'DEVICE'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card lg:col-span-2 space-y-4">
              <div className="section-title">24h Telemetry</div>
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={telemetry}>
                  <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45"/><XAxis dataKey="time" tick={CS} minTickGap={20}/><YAxis tick={CS} unit="°C"/>
                  <Tooltip contentStyle={TS}/><Area type="monotone" dataKey="temp" stroke="#f59e0b" fill="url(#tg)" strokeWidth={2} name="Temp °C" dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={telemetry}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45"/><XAxis dataKey="time" tick={CS} minTickGap={20}/><YAxis tick={CS} unit="%"/>
                  <Tooltip contentStyle={TS}/><Legend wrapperStyle={CS}/>
                  <Area type="monotone" dataKey="cpu_pct" stroke="#00d4ff" fill="none" strokeWidth={2} name="CPU %" dot={false}/>
                  <Area type="monotone" dataKey="gpu_pct" stroke="#7c3aed" fill="none" strokeWidth={2} name="GPU %" dot={false} strokeDasharray="4 2"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
