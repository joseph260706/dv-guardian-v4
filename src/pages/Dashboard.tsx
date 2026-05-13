import { useEffect, useState } from 'react'
import { Zap, Thermometer, AlertTriangle, Leaf, Wifi, Battery, Activity, Wind, Server, TrendingUp, Shield, Globe } from 'lucide-react'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts'
import { useKPIStore, useRackStore, useAlertStore } from '../store'
import { getPowerHistory, FACILITIES, HALLS, INCIDENTS, getPredictions } from '../data/engine'
import { KPICard, PageHeader, Severity, ProgressBar, Markdown } from '../components/shared'
import { format } from 'date-fns'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const CS = { fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#64748b' }
const TS = { backgroundColor: '#161b27', border: '1px solid #1e2d45', fontFamily: 'JetBrains Mono', fontSize: 10, borderRadius: 8 }

export default function Dashboard() {
  const { kpis, updated } = useKPIStore()
  const { racks } = useRackStore()
  const { alerts, ack } = useAlertStore()
  const [history, setHistory] = useState(() => getPowerHistory(4))
  const [selectedFacility, setSelectedFacility] = useState('fac-lon')
  const predictions = getPredictions().slice(0, 6)

  useEffect(() => { const iv = setInterval(() => setHistory(getPowerHistory(4)), 10000); return () => clearInterval(iv) }, [])

  const pueStatus = kpis?.pue > 1.5 ? 'critical' : kpis?.pue > 1.35 ? 'warning' : 'good'
  const unacked = alerts.filter((a: any) => !a.acknowledged)
  const openIncidents = INCIDENTS.filter(i => i.status !== 'resolved')

  return (
    <div className="space-y-5">
      <PageHeader
        title="Command Center"
        sub="Enterprise infrastructure operational intelligence — real-time"
        crumbs={['DCIM Platform', 'Command Center']}
        updated={updated}
        actions={
          <div className="flex items-center gap-2">
            <select value={selectedFacility} onChange={e => setSelectedFacility(e.target.value)} className="input text-xs py-1.5">
              {FACILITIES.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            {kpis?.active_incident && (
              <div className="flex items-center gap-1.5 bg-critical/10 border border-critical/30 rounded-lg px-3 py-1.5 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-critical" />
                <span className="text-xs font-mono text-critical font-bold">ACTIVE INCIDENT</span>
              </div>
            )}
          </div>
        }
      />

      {/* Multi-facility status */}
      <div className="grid grid-cols-3 gap-3">
        {FACILITIES.map(f => (
          <div key={f.id} className={clsx('card flex items-center gap-3 cursor-pointer transition-all', selectedFacility === f.id ? 'border-accent/40 bg-accent/5' : '')}
            onClick={() => setSelectedFacility(f.id)}>
            <Globe className={clsx('w-5 h-5 flex-shrink-0', selectedFacility === f.id ? 'text-accent' : 'text-text-secondary')} />
            <div className="flex-1 min-w-0">
              <div className="font-mono text-xs font-bold text-text-primary truncate">{f.name}</div>
              <div className="text-[10px] font-mono text-text-secondary">{f.location}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-mono text-success">PUE {f.pue}</span>
                <span className="text-[10px] font-mono text-accent">{f.racks} racks</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-mono font-bold text-warning">{f.used_kw.toLocaleString()}</div>
              <div className="text-[10px] font-mono text-text-secondary">/{f.total_kw.toLocaleString()} kW</div>
            </div>
          </div>
        ))}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Total Power" value={kpis?.total_power_kw?.toFixed(1)} unit="kW" icon={<Zap className="w-4 h-4" />} sub={`IT: ${kpis?.it_power_kw?.toFixed(1)} kW`} />
        <KPICard label="PUE" value={kpis?.pue?.toFixed(3)} icon={<Activity className="w-4 h-4" />} status={pueStatus} sub={`Target < 1.30`} trend={+((kpis?.pue - 1.30) * 10).toFixed(1)} />
        <KPICard label="Avg Temperature" value={kpis?.avg_temp_c?.toFixed(1)} unit="°C" icon={<Thermometer className="w-4 h-4" />} status={kpis?.avg_temp_c > 35 ? 'critical' : kpis?.avg_temp_c > 30 ? 'warning' : 'good'} />
        <KPICard label="Active Alerts" value={kpis?.active_alerts} icon={<AlertTriangle className="w-4 h-4" />} status={kpis?.active_alerts > 5 ? 'critical' : 'warning'} sub={`${openIncidents.length} open incidents`} />
        <KPICard label="Renewable Energy" value={kpis?.renewable_pct?.toFixed(1)} unit="%" icon={<Leaf className="w-4 h-4" />} status={kpis?.renewable_pct > 60 ? 'good' : 'warning'} sub={`${kpis?.carbon_gco2_kwh} gCO₂/kWh`} />
        <KPICard label="Carbon Intensity" value={kpis?.carbon_gco2_kwh} unit="gCO₂" icon={<Wind className="w-4 h-4" />} />
        <KPICard label="UPS Health" value={kpis?.ups_health_pct?.toFixed(1)} unit="%" icon={<Battery className="w-4 h-4" />} status={kpis?.ups_health_pct < 85 ? 'critical' : kpis?.ups_health_pct < 90 ? 'warning' : 'good'} />
        <KPICard label="Health Score" value={kpis?.health_score} unit="/100" icon={<Shield className="w-4 h-4" />} status={kpis?.health_score > 80 ? 'good' : kpis?.health_score > 60 ? 'warning' : 'critical'} sub="AI composite score" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <div className="section-title">Power & PUE — Last 4 Hours</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={history.slice(-48)}>
              <defs>
                <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00d4ff" stopOpacity={0.25}/><stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/></linearGradient>
                <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2}/><stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
              <XAxis dataKey="time" tick={CS} minTickGap={20} />
              <YAxis tick={CS} width={45} />
              <Tooltip contentStyle={TS} />
              <Area type="monotone" dataKey="total" stroke="#00d4ff" fill="url(#gp)" strokeWidth={2} name="Total kW" dot={false} />
              <Area type="monotone" dataKey="it" stroke="#7c3aed" fill="url(#gi)" strokeWidth={1.5} name="IT kW" dot={false} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="section-title">Facility Overview</div>
          <div className="space-y-3">
            {[
              { label: 'Capacity Utilisation', value: kpis?.capacity_util_pct, unit: '%', color: 'bg-accent' },
              { label: 'Network Utilisation', value: kpis?.network_util_pct, unit: '%', color: 'bg-success' },
              { label: 'Cooling Efficiency', value: kpis?.cooling_eff_pct, unit: '%', color: 'bg-purple' },
              { label: 'UPS Health', value: kpis?.ups_health_pct, unit: '%', color: 'bg-warning' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs font-mono text-text-secondary mb-1">
                  <span>{label}</span><span className="text-text-primary font-bold">{value?.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(100, value ?? 0)}%` }} />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-border">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-text-secondary">Cost / Hour</span>
                <span className="text-accent font-bold">£{kpis?.cost_per_hour?.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-xs font-mono mt-1">
                <span className="text-text-secondary">Cost / Day (est.)</span>
                <span className="text-accent font-bold">£{kpis?.cost_per_day?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rack floor + Alerts + Predictions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Rack heatmap */}
        <div className="card lg:col-span-2">
          <div className="section-title">Rack Floor — {racks.length} Racks · Live Thermal & Power</div>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(20, 1fr)' }}>
            {racks.map((r: any) => (
              <div key={r.id}
                title={`${r.label} · ${r.temp_c}°C · ${r.power_used_kw?.toFixed(1)}kW · ${r.status}`}
                className={clsx('aspect-square rounded border flex flex-col items-center justify-center cursor-default transition-all',
                  r.status === 'critical' ? 'heatmap-critical alert-pulse' : r.status === 'warning' ? 'heatmap-warning' : 'heatmap-normal',
                  r.is_gpu && 'ring-1 ring-purple/50'
                )}>
                <span className="text-[5px] font-mono font-bold text-white/80 leading-none">{r.label}</span>
                <span className={clsx('text-[5px] font-mono leading-none', r.temp_c > 35 ? 'text-critical' : 'text-success')}>{r.temp_c}°</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-2 text-[10px] font-mono text-text-secondary">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded heatmap-normal border border-success/30 flex-shrink-0" />Normal</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded heatmap-warning border border-warning/30 flex-shrink-0" />Warning</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded heatmap-critical border border-critical/30 flex-shrink-0" />Critical</span>
            <span className="flex items-center gap-1.5 ml-auto"><span className="w-2.5 h-2.5 rounded ring-1 ring-purple/50 bg-surface flex-shrink-0" />GPU Rack</span>
          </div>
        </div>

        {/* Alerts + Predictions */}
        <div className="space-y-4">
          {/* Active alerts */}
          <div className="card">
            <div className="section-title">Active Alerts ({unacked.length})</div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {unacked.slice(0,8).map((a: any) => (
                <div key={a.id} className={clsx('border rounded-lg p-2 flex items-start gap-2',
                  a.severity === 'critical' ? 'border-critical/25 bg-critical/5' : a.severity === 'high' ? 'border-warning/25 bg-warning/5' : 'border-border bg-surface/50')}>
                  <Severity sev={a.severity} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-mono text-text-primary truncate leading-tight">{a.title}</p>
                    <p className="text-[9px] font-mono text-text-secondary">{a.rack_label} · {a.system}</p>
                  </div>
                  <button onClick={() => { ack(a.id); toast.success('Alert acknowledged') }}
                    className="text-[9px] font-mono text-text-secondary hover:text-success border border-border rounded px-1.5 py-0.5 flex-shrink-0">ACK</button>
                </div>
              ))}
            </div>
          </div>

          {/* Top predictions */}
          <div className="card">
            <div className="section-title">AI Predictions</div>
            <div className="space-y-2">
              {predictions.slice(0,5).map(p => (
                <div key={p.id} className="flex items-center gap-2">
                  <Severity sev={p.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono text-text-primary truncate">{p.rack_label}</div>
                    <div className="text-[9px] font-mono text-text-secondary">{p.type_label}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[10px] font-mono font-bold text-text-primary">{p.confidence_pct.toFixed(0)}%</div>
                    <div className="text-[9px] font-mono text-text-secondary">{p.time_horizon_min < 60 ? `${p.time_horizon_min}m` : `${Math.round(p.time_horizon_min/60)}h`}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Incidents + Halls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="section-title">Open Incidents ({openIncidents.length})</div>
          <div className="space-y-2">
            {openIncidents.map(inc => (
              <div key={inc.id} className={clsx('border rounded-xl p-3',
                inc.severity === 'critical' ? 'border-critical/25 bg-critical/5' : inc.severity === 'high' ? 'border-warning/25 bg-warning/5' : 'border-border bg-surface/50')}>
                <div className="flex items-start gap-2">
                  <Severity sev={inc.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs font-bold text-text-primary">{inc.title}</div>
                    <div className="text-[10px] font-mono text-text-secondary mt-0.5">{inc.id} · {inc.status} · {inc.affected_systems?.slice(0,2).join(', ')}</div>
                    {inc.blast_radius && <div className="text-[10px] font-mono text-warning mt-0.5">Blast radius: {inc.blast_radius.racks} racks · {inc.blast_radius.devices} devices</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-title">Hall Status</div>
          <div className="space-y-3">
            {HALLS.map(hall => {
              const hallRacks = racks.filter((r: any) => r.hall_id === hall.id)
              const critCount = hallRacks.filter((r: any) => r.status === 'critical').length
              const warnCount = hallRacks.filter((r: any) => r.status === 'warning').length
              const avgTemp = hallRacks.length ? +(hallRacks.reduce((s: number, r: any) => s + r.temp_c, 0) / hallRacks.length).toFixed(1) : 0
              const totalPower = +(hallRacks.reduce((s: number, r: any) => s + r.power_used_kw, 0)).toFixed(1)
              return (
                <div key={hall.id} className="border border-border rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-mono text-sm font-bold text-text-primary">{hall.name}</span>
                      <span className="text-xs font-mono text-text-secondary ml-2">{hall.cooling}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {critCount > 0 && <span className="text-[9px] font-mono text-critical font-bold">{critCount} CRIT</span>}
                      {warnCount > 0 && <span className="text-[9px] font-mono text-warning font-bold">{warnCount} WARN</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><div className="text-sm font-mono font-bold text-text-primary">{avgTemp}°C</div><div className="text-[9px] font-mono text-text-secondary">Avg Temp</div></div>
                    <div><div className="text-sm font-mono font-bold text-warning">{totalPower} kW</div><div className="text-[9px] font-mono text-text-secondary">Power</div></div>
                    <div><div className="text-sm font-mono font-bold text-text-primary">{hall.racks}</div><div className="text-[9px] font-mono text-text-secondary">Racks</div></div>
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={totalPower} max={hall.floor_kw} h="h-1" label="" showPct={false} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
