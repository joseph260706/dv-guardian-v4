import { useState } from 'react'
import { Leaf, Wind, Zap, TrendingDown, Droplets } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { subHours, format } from 'date-fns'
import { useKPIStore } from '../store'
import { SUSTAINABILITY_RECS, CFG } from '../data/engine'
import { PageHeader, KPICard } from '../components/shared'
import clsx from 'clsx'

const CS = { fontSize: 9, fontFamily: 'monospace', fill: '#64748b' }
const TS = { contentStyle: { backgroundColor: '#0f1623', border: '1px solid #1e293b', fontSize: 10, borderRadius: 8 } }

const EFFORT_STYLE: Record<string, string> = {
  low: 'text-green-400 border-green-700/40 bg-green-900/20',
  medium: 'text-yellow-400 border-yellow-700/40 bg-yellow-900/20',
  high: 'text-red-400 border-red-700/40 bg-red-900/20',
}

function buildTrend(days: number) {
  return Array.from({ length: days * 4 }, (_, i) => {
    const ts = subHours(new Date(), days * 24 - i * 6)
    const ren = Math.min(95, Math.max(5, CFG.renewableTarget - 5 + 18 * Math.sin(2 * Math.PI * i / (24 * 7 / 6)) + Math.random() * 8 - 4))
    return {
      time: format(ts, 'MMM d'),
      pue: +(1.38 + 0.08 * Math.sin(2 * Math.PI * i / 4) + Math.random() * 0.04 - 0.02).toFixed(3),
      renewable: +ren.toFixed(1),
      carbon: +(50 + 280 * (1 - ren / 100) + Math.random() * 10 - 5).toFixed(0),
    }
  })
}

export default function Sustainability() {
  const kpis = useKPIStore(s => s.kpis)
  const [tariff, setTariff] = useState(CFG.tariffGbp)
  const trend = buildTrend(30)

  const power = kpis?.total_power_kw ?? 8400
  const pue = kpis?.pue ?? 1.38
  const ren = kpis?.renewable_pct ?? 48
  const carbon = kpis?.carbon_gco2_kwh ?? 164
  const coolingEff = kpis?.cooling_eff_pct ?? 88

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sustainability Centre"
        subtitle="PUE optimisation · Carbon footprint · Renewable energy · Efficiency scoring"
        icon={<Leaf className="w-5 h-5 text-green-400" />}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="PUE" value={pue.toFixed(3)} sub={`Target < ${CFG.pueTarget}`}
          status={pue > 1.5 ? 'crit' : pue > 1.35 ? 'warn' : 'ok'} icon={<Zap />} />
        <KPICard label="Carbon Intensity" value={`${carbon.toFixed(0)} gCO₂`} sub={`${(power * carbon / 1000).toFixed(1)} kg/hr`}
          status="ok" icon={<Leaf />} />
        <KPICard label="Renewable" value={`${ren.toFixed(1)}%`} sub={`Target: ${CFG.renewableTarget}%`}
          status={ren > 50 ? 'ok' : 'warn'} icon={<Wind />} />
        <KPICard label="WUE" value="1.52 L/kWh" sub="Target < 1.50"
          status="warn" icon={<Droplets />} />
      </div>

      {/* Cards row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Carbon footprint */}
        <div className="card">
          <h3 className="font-semibold text-white mb-3">Carbon Footprint</h3>
          {[
            { l: 'Per Hour', v: `${(power * carbon / 1000).toFixed(2)} kg` },
            { l: 'Per Day', v: `${(power * carbon * 24 / 1000).toFixed(0)} kg` },
            { l: 'Per Month', v: `${(power * carbon * 24 * 30 / 1000).toFixed(0)} kg` },
            { l: 'Per Year', v: `${(power * carbon * 8760 / 1000).toFixed(0)} kg` },
          ].map(({ l, v }) => (
            <div key={l} className="flex justify-between py-2 border-b border-slate-800 text-sm last:border-0">
              <span className="text-slate-400">{l}</span>
              <span className="font-mono font-bold text-white">{v} CO₂</span>
            </div>
          ))}
        </div>

        {/* Cost estimator */}
        <div className="card">
          <h3 className="font-semibold text-white mb-3">Cost Estimator</h3>
          <div className="mb-3">
            <label className="text-xs text-slate-400 block mb-1">Tariff (£/kWh)</label>
            <input type="number" step="0.01" value={tariff}
              onChange={e => setTariff(+e.target.value || 0.28)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-600" />
          </div>
          {[
            { l: 'Hourly', v: power * tariff },
            { l: 'Daily', v: power * tariff * 24 },
            { l: 'Monthly', v: power * tariff * 24 * 30 },
            { l: 'Annual', v: power * tariff * 8760 },
          ].map(({ l, v }) => (
            <div key={l} className="flex justify-between py-1.5 border-b border-slate-800 text-sm last:border-0">
              <span className="text-slate-400">{l}</span>
              <span className="font-mono font-bold text-cyan-400">£{v.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          ))}
        </div>

        {/* Efficiency gauges */}
        <div className="card">
          <h3 className="font-semibold text-white mb-3">Efficiency Gauges</h3>
          <div className="space-y-3">
            {[
              { l: 'PUE Efficiency', v: 100 / pue },
              { l: 'Renewable Utilisation', v: ren },
              { l: 'Cooling Efficiency', v: coolingEff },
              { l: 'IT Equipment Utilisation', v: 74 },
            ].map(({ l, v }) => (
              <div key={l}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">{l}</span>
                  <span className="font-mono font-bold text-white">{v.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.min(100, v)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-white mb-3">PUE Trend — 30 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" tick={CS} minTickGap={30} />
              <YAxis tick={CS} domain={[1.0, 1.8]} />
              <Tooltip {...TS} />
              <ReferenceLine y={CFG.pueTarget} stroke="#10b981" strokeDasharray="4 2" />
              <Line type="monotone" dataKey="pue" stroke="#f59e0b" strokeWidth={2} dot={false} name="PUE" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="font-semibold text-white mb-3">Renewable & Carbon — 30 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" tick={CS} minTickGap={30} />
              <YAxis tick={CS} />
              <Tooltip {...TS} />
              <Line type="monotone" dataKey="renewable" stroke="#10b981" strokeWidth={2} dot={false} name="Renewable %" />
              <Line type="monotone" dataKey="carbon" stroke="#ef4444" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="gCO₂/kWh" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI recommendations */}
      <div className="card">
        <h3 className="font-semibold text-white mb-4">AI Sustainability Recommendations</h3>
        <div className="space-y-3">
          {SUSTAINABILITY_RECS.map(r => (
            <div key={r.id} className="border border-slate-700/50 rounded-xl p-4 hover:border-cyan-700/40 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs font-bold text-cyan-400">#{r.priority}</span>
                    <span className="font-mono text-sm font-bold text-white">{r.title}</span>
                    <span className={clsx('border rounded px-1.5 py-0.5 text-xs font-mono', EFFORT_STYLE[r.effort])}>{r.effort}</span>
                    <span className="text-xs font-mono text-slate-400 border border-slate-700 rounded px-1.5 py-0.5">{r.category}</span>
                  </div>
                  <p className="text-xs text-slate-400">{r.desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-green-400 font-mono font-bold text-sm">£{r.savings_gbp_yr.toLocaleString()}/yr</div>
                  <div className="text-xs text-slate-500">{r.savings_kw} kW saved</div>
                  <div className="text-xs text-green-500/70">{r.carbon_kg_yr.toLocaleString()} kg CO₂/yr</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
