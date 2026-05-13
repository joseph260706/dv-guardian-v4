import { useState } from 'react'
import { Leaf, Wind, Zap, TrendingDown } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useKPIStore } from '../store'
import { getPowerHistory, getCarbonTrend, SUSTAINABILITY_RECS, CFG } from '../data/engine'
import { PageHeader, KPICard, ProgressBar, Callout } from '../components/shared'
import clsx from 'clsx'

const CS={fontSize:9,fontFamily:'JetBrains Mono',fill:'#64748b'}
const TS={backgroundColor:'#161b27',border:'1px solid #1e2d45',fontFamily:'JetBrains Mono',fontSize:10,borderRadius:8}
const EFFORT_STYLE:Record<string,string>={low:'text-success border-success/30 bg-success/10',medium:'text-warning border-warning/30 bg-warning/10',high:'text-critical border-critical/30 bg-critical/10'}
function getCarbonTrend(days=30){
  const {getPowerHistory,subHours,format}={getPowerHistory:require('../data/engine').getPowerHistory,subHours:require('date-fns').subHours,format:require('date-fns').format}
  return Array.from({length:days*4},(_,i)=>{
    const ts=subHours(new Date(),(days*24)-i*6)
    const ren=Math.min(95,Math.max(5,CFG.renewableTarget-5+18*Math.sin(2*Math.PI*i/(24*7/6))+Math.random()*8-4))
    return{ts:ts.toISOString(),time:format(ts,'MMM d'),pue:+(1.38+0.08*Math.sin(2*Math.PI*i/4)+Math.random()*0.04-0.02).toFixed(3),renewable:+ren.toFixed(1),carbon:+(50+280*(1-ren/100)+Math.random()*10-5).toFixed(0)}
  })
}

export default function Sustainability() {
  const { kpis } = useKPIStore()
  const [tariff, setTariff] = useState(CFG.tariffGbp)
  const trend = getCarbonTrend(30)
  const power = kpis?.total_power_kw??8400
  const pue = kpis?.pue??1.38
  const ren = kpis?.renewable_pct??48
  const carbon = kpis?.carbon_gco2_kwh??164

  return (
    <div className="space-y-5">
      <PageHeader title="Sustainability Centre" sub="PUE optimisation · Carbon footprint · Renewable energy · Efficiency scoring" crumbs={['DCIM','Sustainability']}/>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="PUE" value={pue.toFixed(3)} icon={<Zap className="w-4 h-4"/>} status={pue>1.5?'critical':pue>1.35?'warning':'good'} sub={`Target < ${CFG.pueTarget}`}/>
        <KPICard label="Carbon Intensity" value={carbon.toFixed(0)} unit="gCO₂/kWh" icon={<Leaf className="w-4 h-4"/>} sub={`${(power*carbon/1000).toFixed(1)} kg/hr`}/>
        <KPICard label="Renewable" value={ren.toFixed(1)} unit="%" icon={<Wind className="w-4 h-4"/>} status={ren>50?'good':'warning'} sub={`Target: ${CFG.renewableTarget}%`}/>
        <KPICard label="WUE" value="1.52" unit="L/kWh" icon={<TrendingDown className="w-4 h-4"/>} sub="Target < 1.50"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card">
          <div className="section-title">Carbon Footprint</div>
          {[{l:'Per Hour',v:`${(power*carbon/1000).toFixed(2)} kg`},{l:'Per Day',v:`${(power*carbon*24/1000).toFixed(0)} kg`},{l:'Per Month',v:`${(power*carbon*24*30/1000).toFixed(0)} kg`},{l:'Per Year',v:`${(power*carbon*8760/1000).toFixed(0)} kg`}].map(({l,v})=>(
            <div key={l} className="flex justify-between py-2 border-b border-border text-sm font-mono last:border-0">
              <span className="text-text-secondary">{l}</span><span className="font-bold text-text-primary">{v} CO₂</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="section-title">Cost Estimator</div>
          <div className="mb-3"><label className="text-xs font-mono text-text-secondary block mb-1">Tariff (£/kWh)</label><input type="number" step="0.01" value={tariff} onChange={e=>setTariff(+e.target.value||0.28)} className="input w-full"/></div>
          {[{l:'Hourly',v:power*tariff},{l:'Daily',v:power*tariff*24},{l:'Monthly',v:power*tariff*24*30},{l:'Annual',v:power*tariff*8760}].map(({l,v})=>(
            <div key={l} className="flex justify-between py-1.5 border-b border-border text-sm font-mono last:border-0">
              <span className="text-text-secondary">{l}</span><span className="text-accent font-bold">£{v.toLocaleString(undefined,{maximumFractionDigits:0})}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="section-title">Efficiency Gauges</div>
          <div className="space-y-3">
            {[{l:'PUE Efficiency',v:100/pue},{l:'Renewable Utilisation',v:ren},{l:'Cooling Efficiency',v:kpis?.cooling_eff_pct??88},{l:'IT Equipment Utilisation',v:72+Math.random()*10}].map(({l,v})=>(
              <div key={l}><div className="flex justify-between text-xs font-mono mb-1"><span className="text-text-secondary">{l}</span><span className="font-bold text-text-primary">{v.toFixed(1)}%</span></div>
                <div className="h-1.5 bg-border rounded-full overflow-hidden"><div className="h-full rounded-full bg-accent" style={{width:`${Math.min(100,v)}%`}}/></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="section-title">PUE Trend — 30 Days</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45"/><XAxis dataKey="time" tick={CS} minTickGap={30}/><YAxis tick={CS} domain={[1.0,1.8]}/>
              <Tooltip contentStyle={TS}/>
              <ReferenceLine y={CFG.pueTarget} stroke="#10b981" strokeDasharray="4 2"/>
              <Line type="monotone" dataKey="pue" stroke="#f59e0b" strokeWidth={2} name="PUE" dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="section-title">Renewable % — 30 Days</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45"/><XAxis dataKey="time" tick={CS} minTickGap={30}/><YAxis tick={CS} unit="%"/>
              <Tooltip contentStyle={TS}/>
              <Line type="monotone" dataKey="renewable" stroke="#10b981" strokeWidth={2} name="Renewable %" dot={false}/>
              <Line type="monotone" dataKey="carbon" stroke="#ef4444" strokeWidth={1.5} name="gCO₂/kWh" dot={false} strokeDasharray="4 2"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="section-title">AI Sustainability Recommendations</div>
        <div className="space-y-3">
          {SUSTAINABILITY_RECS.map(r=>(
            <div key={r.id} className="border border-border rounded-xl p-4 hover:border-accent/20 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs font-bold text-accent">#{r.priority}</span>
                    <span className="font-mono text-sm font-bold text-text-primary">{r.title}</span>
                    <span className={clsx('border rounded px-1.5 py-0.5 text-[10px] font-mono',EFFORT_STYLE[r.effort])}>{r.effort}</span>
                    <span className="text-[10px] font-mono text-text-secondary border border-border rounded px-1.5 py-0.5">{r.category}</span>
                  </div>
                  <p className="text-xs font-mono text-text-secondary">{r.desc}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-success font-mono font-bold text-sm">£{r.savings_gbp_yr.toLocaleString()}/yr</div>
                  <div className="text-[10px] font-mono text-text-secondary">{r.savings_kw} kW saved</div>
                  <div className="text-[10px] font-mono text-success/70">{r.carbon_kg_yr.toLocaleString()} kg CO₂/yr</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
