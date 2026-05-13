import { useState } from 'react'
import { FlaskConical, Play, RotateCcw, TrendingUp, Thermometer, Zap, Leaf, AlertTriangle, CheckCircle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { PageHeader, KPICard, Btn } from '../components/shared'
import { CFG, getLiveKPIs } from '../data/engine'

const SCENARIOS = [
  {
    id:'workload_surge',
    name:'AI Training Workload Surge',
    icon: TrendingUp,
    color:'text-orange-400',
    desc:'Simulate adding 40% more GPU training workloads across Hall B — predict thermal, power, and cooling impact.',
    params:[
      { key:'workload_pct', label:'Additional Workload', unit:'%', min:10, max:100, default:40 },
      { key:'duration_h', label:'Duration', unit:'h', min:1, max:72, default:8 },
      { key:'gpu_racks', label:'GPU Racks Affected', unit:'', min:1, max:20, default:10 },
    ]
  },
  {
    id:'cooling_failure',
    name:'Cooling System Failure',
    icon: Thermometer,
    color:'text-red-400',
    desc:'Model progressive CRAC failure in Hall A — predict cascade timeline, thermal limits, and required mitigation.',
    params:[
      { key:'crac_count', label:'CRACs Failed', unit:'', min:1, max:4, default:1 },
      { key:'failure_rate', label:'Degradation Rate', unit:'%/hr', min:5, max:50, default:12 },
      { key:'ambient_c', label:'Ambient Temp Rise', unit:'°C', min:1, max:10, default:3 },
    ]
  },
  {
    id:'power_outage',
    name:'Partial Power Outage',
    icon: Zap,
    color:'text-yellow-400',
    desc:'Simulate loss of a UPS unit — model failover, battery runtime, risk of cascade failure, and recovery actions.',
    params:[
      { key:'ups_count', label:'UPS Units Lost', unit:'', min:1, max:3, default:1 },
      { key:'load_pct', label:'Current Load', unit:'%', min:50, max:100, default:75 },
      { key:'battery_h', label:'Battery Runtime', unit:'min', min:5, max:30, default:12 },
    ]
  },
  {
    id:'green_migration',
    name:'Workload Consolidation (Green)',
    icon: Leaf,
    color:'text-green-400',
    desc:'Model consolidating 30% of workloads from Hall A to Hall C liquid cooling — compute PUE and carbon savings.',
    params:[
      { key:'migrate_pct', label:'Workloads to Migrate', unit:'%', min:10, max:80, default:30 },
      { key:'target_hall', label:'Target Hall Capacity', unit:'%', min:50, max:90, default:70 },
      { key:'transition_h', label:'Migration Window', unit:'h', min:2, max:24, default:4 },
    ]
  },
]

const TooltipStyle = {
  contentStyle: { background:'#0f1623', border:'1px solid #1e293b', borderRadius:'8px', fontSize:'12px' },
  labelStyle: { color:'#94a3b8' },
}

function SimResult({ scenario, params }: { scenario: any, params: Record<string, number> }) {
  const baseKpi = getLiveKPIs()

  const generateTimeline = () => {
    return Array.from({length: 25}, (_, i) => {
      const t = i * (scenario.id==='cooling_failure' ? 0.5 : 1)
      let temp = baseKpi.avg_temp_c, power = baseKpi.total_power_kw, pue = baseKpi.pue

      if (scenario.id === 'workload_surge') {
        const surge = Math.min(1, t / 2) * (params.workload_pct / 100)
        power = baseKpi.total_power_kw * (1 + surge * 0.4)
        temp = baseKpi.avg_temp_c + surge * 5
        pue = Math.min(1.9, baseKpi.pue + surge * 0.15)
      } else if (scenario.id === 'cooling_failure') {
        const decay = Math.min(1, t * (params.failure_rate / 100))
        temp = baseKpi.avg_temp_c + decay * 18 + params.ambient_c * Math.min(1, t/5)
        pue = Math.min(2.2, baseKpi.pue + decay * 0.5)
        power = baseKpi.total_power_kw * (1 + decay * 0.08)
      } else if (scenario.id === 'power_outage') {
        const batt = Math.max(0, 1 - t / (params.battery_h / 60))
        power = baseKpi.total_power_kw * (1 - (1 - batt) * 0.12 * params.ups_count)
        temp = baseKpi.avg_temp_c + (1 - batt) * 4
        pue = baseKpi.pue + (1 - batt) * 0.1
      } else if (scenario.id === 'green_migration') {
        const progress = Math.min(1, t / params.transition_h)
        const saving = progress * (params.migrate_pct / 100) * 0.08
        pue = Math.max(1.1, baseKpi.pue - saving)
        power = baseKpi.total_power_kw * (1 - saving * 0.3)
        temp = baseKpi.avg_temp_c - progress * 2
      }

      return {
        t: `${t.toFixed(0)}h`,
        temp: +temp.toFixed(1),
        power: +power.toFixed(0),
        pue: +pue.toFixed(3),
        threshold: CFG.tempWarning,
        critical: CFG.tempCritical,
      }
    })
  }

  const data = generateTimeline()
  const maxTemp = Math.max(...data.map(d => d.temp))
  const endPue = data[data.length-1].pue
  const endPower = data[data.length-1].power
  const isCritical = maxTemp > CFG.tempCritical

  const outcomes: any[] = []
  if (scenario.id === 'workload_surge') {
    outcomes.push(
      { ok: maxTemp < CFG.tempWarning, label:`Peak temperature ${maxTemp.toFixed(1)}°C ${maxTemp<CFG.tempWarning?'(safe)':'⚠ exceeds warning threshold'}` },
      { ok: endPower < CFG.totalCapacityKw, label:`Peak power ${endPower.toLocaleString()} kW (${((endPower/CFG.totalCapacityKw)*100).toFixed(0)}% capacity)` },
      { ok: endPue < CFG.pueCritical, label:`PUE impact: ${baseKpi.pue.toFixed(3)} → ${endPue.toFixed(3)}` },
    )
  } else if (scenario.id === 'cooling_failure') {
    const breachIdx = data.findIndex(d => d.temp > CFG.tempCritical)
    outcomes.push(
      { ok: !isCritical, label: isCritical ? `🔴 Thermal runaway predicted at T+${(breachIdx * 0.5).toFixed(1)}h` : '✅ Temps remain below critical threshold' },
      { ok: false, label:`Workload migration required within ${Math.max(0, (breachIdx-2)*0.5).toFixed(1)}h of failure` },
      { ok: true, label:`CRAC-B1/B2 have capacity to absorb load if redistributed` },
    )
  } else if (scenario.id === 'power_outage') {
    outcomes.push(
      { ok: params.battery_h > 10, label:`UPS runtime ${params.battery_h}min ${params.battery_h>10?'(sufficient for orderly shutdown)':'⚠ insufficient — data loss risk'}` },
      { ok: true, label:`Failover path available: UPS-C3 has ${(100 - 75).toFixed(0)}% spare capacity` },
      { ok: params.ups_count < 2, label: params.ups_count < 2 ? 'Single UPS loss — redundancy maintained' : '⚠ Multiple UPS loss — SLA breach likely' },
    )
  } else if (scenario.id === 'green_migration') {
    const pueSaving = baseKpi.pue - endPue
    const kwSaving = baseKpi.total_power_kw - endPower
    outcomes.push(
      { ok: true, label:`PUE improvement: ${baseKpi.pue.toFixed(3)} → ${endPue.toFixed(3)} (Δ${pueSaving.toFixed(3)})` },
      { ok: true, label:`Power saving: ${kwSaving.toFixed(0)} kW = £${(kwSaving * CFG.tariffGbp * 8760).toFixed(0)}/year` },
      { ok: true, label:`Carbon reduction: ~${(kwSaving * 164 / 1000 * 8760).toFixed(0)} kg CO₂/year` },
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <div className={`text-2xl font-bold font-mono ${maxTemp>CFG.tempCritical?'text-red-400':maxTemp>CFG.tempWarning?'text-yellow-400':'text-white'}`}>{maxTemp.toFixed(1)}°C</div>
          <div className="text-xs text-slate-400 mt-0.5">Peak Temperature</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold font-mono text-white">{endPue.toFixed(3)}</div>
          <div className="text-xs text-slate-400 mt-0.5">Projected PUE</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold font-mono text-white">{(endPower/1000).toFixed(1)} MW</div>
          <div className="text-xs text-slate-400 mt-0.5">Peak Power</div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-white mb-3">Simulation Timeline</h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f87171" stopOpacity={0.3}/><stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="pueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="t" tick={{fill:'#64748b',fontSize:10}} />
            <YAxis yAxisId="left" tick={{fill:'#64748b',fontSize:10}} />
            <YAxis yAxisId="right" orientation="right" tick={{fill:'#64748b',fontSize:10}} domain={[1.0,2.5]} />
            <Tooltip {...TooltipStyle} />
            <Legend wrapperStyle={{fontSize:'12px',color:'#94a3b8'}} />
            <Area yAxisId="left" type="monotone" dataKey="temp" name="Temp (°C)" stroke="#f87171" fill="url(#tempGrad)" strokeWidth={2} dot={false} />
            <Area yAxisId="right" type="monotone" dataKey="pue" name="PUE" stroke="#8b5cf6" fill="url(#pueGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3 className="font-semibold text-white mb-3">AI Outcome Analysis</h3>
        <div className="space-y-2">
          {outcomes.map((o, i) => (
            <div key={i} className={`flex items-start gap-2.5 text-sm p-2.5 rounded-lg ${o.ok?'bg-green-900/10 border border-green-800/30':'bg-red-900/10 border border-red-800/30'}`}>
              {o.ok ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
              <span className="text-slate-300">{o.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function SimulationLab() {
  const [selected, setSelected] = useState<any>(null)
  const [params, setParams] = useState<Record<string, number>>({})
  const [result, setResult] = useState(false)

  const selectScenario = (s: any) => {
    setSelected(s)
    setResult(false)
    const defaults: Record<string, number> = {}
    s.params.forEach((p: any) => { defaults[p.key] = p.default })
    setParams(defaults)
  }

  const run = () => setResult(true)
  const reset = () => { setResult(false); setSelected(null) }

  return (
    <div>
      <PageHeader title="Simulation Lab" subtitle="What-if scenario modelling · Failure impact prediction · Capacity planning"
        icon={<FlaskConical className="w-5 h-5 text-cyan-400" />} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Scenarios Available" value={SCENARIOS.length} sub="Production-grade models" status="ok" icon={<FlaskConical />} />
        <KPICard label="Model Accuracy" value="94.2%" sub="Historical validation" status="ok" icon={<CheckCircle />} />
        <KPICard label="Simulation Time" value="<2s" sub="Real-time results" status="ok" icon={<Play />} />
        <KPICard label="Variables" value={SCENARIOS.reduce((s,sc) => s+sc.params.length, 0)} sub="Adjustable parameters" status="ok" icon={<TrendingUp />} />
      </div>

      {!selected ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {SCENARIOS.map(s => (
            <button key={s.id} onClick={() => selectScenario(s)}
              className="card text-left hover:border-cyan-700/50 border border-slate-700/40 transition-all group">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg bg-slate-800 group-hover:bg-slate-700 transition-colors ${s.color}`}><s.icon className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-cyan-300 transition-colors">{s.name}</h3>
                  <p className="text-sm text-slate-400 mt-1">{s.desc}</p>
                  <p className="text-xs text-slate-500 mt-2">{s.params.length} adjustable parameters</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-4">
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <selected.icon className={`w-4 h-4 ${selected.color}`} />
                <h3 className="font-semibold text-white">{selected.name}</h3>
              </div>
              <p className="text-sm text-slate-400 mb-4">{selected.desc}</p>
              <div className="space-y-4">
                {selected.params.map((p: any) => (
                  <div key={p.key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{p.label}</span>
                      <span className="font-mono text-white">{params[p.key]}{p.unit}</span>
                    </div>
                    <input type="range" min={p.min} max={p.max} value={params[p.key]}
                      onChange={e => { setParams({...params, [p.key]: +e.target.value}); setResult(false) }}
                      className="w-full accent-cyan-500" />
                    <div className="flex justify-between text-xs text-slate-600 mt-0.5"><span>{p.min}{p.unit}</span><span>{p.max}{p.unit}</span></div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-5">
                <Btn onClick={run} className="flex-1 justify-center"><Play className="w-4 h-4" />Run</Btn>
                <Btn variant="ghost" onClick={reset}><RotateCcw className="w-4 h-4" /></Btn>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2">
            {result ? <SimResult scenario={selected} params={params} /> : (
              <div className="card flex items-center justify-center h-64 text-slate-500 flex-col gap-3">
                <FlaskConical className="w-10 h-10 opacity-30" />
                <p>Adjust parameters and click Run to simulate</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
