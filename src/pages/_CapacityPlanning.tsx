import { useState } from 'react'
import { TrendingUp, Server, Zap, HardDrive, AlertTriangle, CheckCircle, Calendar } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getCapacityForecast, FACILITIES, CFG } from '../data/engine'
import { PageHeader, KPICard, SimpleTabs as Tabs } from '../components/shared'

const COLORS = { power:'#06b6d4', racks:'#8b5cf6', storage:'#10b981', headroom:'#f59e0b' }

const TooltipStyle = {
  contentStyle: { background:'#0f1623', border:'1px solid #1e293b', borderRadius:'8px', fontSize:'12px' },
  labelStyle: { color:'#94a3b8', marginBottom:'4px' },
}

function PowerForecast() {
  const data = getCapacityForecast(12)
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Power Consumption Forecast</h3>
        <span className="text-xs text-slate-500 font-mono">12-month projection · 3.5% monthly growth</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="headroomGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="month" tick={{fill:'#64748b',fontSize:11}} />
          <YAxis tick={{fill:'#64748b',fontSize:11}} />
          <Tooltip {...TooltipStyle} />
          <Legend wrapperStyle={{fontSize:'12px', color:'#94a3b8'}} />
          <Area type="monotone" dataKey="power_kw" name="Power (kW)" stroke="#06b6d4" fill="url(#powerGrad)" strokeWidth={2} />
          <Area type="monotone" dataKey="headroom_pct" name="Headroom %" stroke="#f59e0b" fill="url(#headroomGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label:'Capacity threshold breach', value:'Month 9', note:'~Sep 2025', color:'text-orange-400' },
          { label:'Expansion trigger point', value:'Month 7', note:'Begin procurement', color:'text-yellow-400' },
          { label:'Current headroom', value:`${(((CFG.totalCapacityKw-8400)/CFG.totalCapacityKw)*100).toFixed(0)}%`, note:`${(CFG.totalCapacityKw-8400).toLocaleString()} kW free`, color:'text-green-400' },
        ].map(m => (
          <div key={m.label} className="bg-slate-800/60 rounded-lg p-3">
            <div className={`text-lg font-bold font-mono ${m.color}`}>{m.value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{m.label}</div>
            <div className="text-xs text-slate-500">{m.note}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RackUtilisation() {
  const data = getCapacityForecast(12)
  return (
    <div className="card">
      <h3 className="font-semibold text-white mb-4">Rack Utilisation Projection</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="month" tick={{fill:'#64748b',fontSize:11}} />
          <YAxis domain={[0,100]} tick={{fill:'#64748b',fontSize:11}} unit="%" />
          <Tooltip {...TooltipStyle} formatter={(v: any) => [`${Number(v).toFixed(1)}%`, 'Rack Utilisation']} />
          <Bar dataKey="rack_utilisation_pct" name="Rack Util %" fill="#8b5cf6" radius={[3,3,0,0]}
            label={{ position:'top', fill:'#64748b', fontSize:10, formatter: (v: number) => v > 80 ? `${v.toFixed(0)}%` : '' }} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500/50 border border-green-500" />Safe (&lt;75%)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-500/50 border border-yellow-500" />Plan (&gt;75%)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/50 border border-red-500" />Critical (&gt;90%)</span>
      </div>
    </div>
  )
}

function StorageGrowth() {
  const data = getCapacityForecast(12)
  return (
    <div className="card">
      <h3 className="font-semibold text-white mb-4">Storage Growth Forecast</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="month" tick={{fill:'#64748b',fontSize:11}} />
          <YAxis tick={{fill:'#64748b',fontSize:11}} />
          <Tooltip {...TooltipStyle} formatter={(v: any) => [`${Number(v).toLocaleString()} TB`, 'Storage']} />
          <Line type="monotone" dataKey="storage_tb" name="Storage (TB)" stroke="#10b981" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function Recommendations() {
  const data = getCapacityForecast(12)
  const actions = data.filter(d => d.recommended_action)
  const recs = [
    { icon: Calendar, title: 'Begin Procurement Planning', detail: 'Month 5: Lead times for compute hardware average 12–16 weeks. Start RFQ process now to avoid capacity gap.', priority: 'high', month: 'Month 5' },
    { icon: Server, title: 'Provision Hall D Expansion', detail: 'Month 8: Current trajectory requires 20 additional racks. Site survey and power provisioning should begin at Month 6.', priority: 'high', month: 'Month 8' },
    { icon: Zap, title: 'UPS Infrastructure Upgrade', detail: 'Expansion capacity will require additional UPS capacity. Procure 2× Eaton 93PM 150kVA units.', priority: 'medium', month: 'Month 7' },
    { icon: TrendingUp, title: 'Liquid Cooling Preparation', detail: 'GPU workload growth will exceed air-cooling limits by Month 10. Begin liquid cooling design for Hall D.', priority: 'medium', month: 'Month 9' },
    { icon: HardDrive, title: 'Storage Tier Expansion', detail: 'NVMe tier will reach 85% by Month 6. Recommend 2× NetApp AFF A900 additions.', priority: 'low', month: 'Month 6' },
  ]
  return (
    <div className="card">
      <h3 className="font-semibold text-white mb-4">AI Capacity Recommendations</h3>
      <div className="space-y-3">
        {recs.map((r, i) => (
          <div key={i} className={`rounded-lg border p-4 ${r.priority==='high'?'border-orange-700/40 bg-orange-900/10':r.priority==='medium'?'border-yellow-700/40 bg-yellow-900/10':'border-slate-700/40 bg-slate-800/30'}`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded ${r.priority==='high'?'bg-orange-900/30 text-orange-400':r.priority==='medium'?'bg-yellow-900/30 text-yellow-400':'bg-slate-700 text-slate-400'}`}>
                <r.icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-white text-sm">{r.title}</span>
                  <span className="text-xs font-mono text-slate-500">{r.month}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-mono ml-auto ${r.priority==='high'?'bg-orange-900/40 text-orange-400':r.priority==='medium'?'bg-yellow-900/40 text-yellow-400':'bg-slate-700 text-slate-400'}`}>{r.priority}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{r.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CapacityPlanning() {
  const data = getCapacityForecast(12)
  const lastMonth = data[data.length - 1]
  const breachMonth = data.find(d => d.headroom_pct < 15)

  return (
    <div>
      <PageHeader title="Capacity Planning" subtitle="12-month power · rack · storage forecasting with AI-driven procurement signals"
        icon={<TrendingUp className="w-5 h-5 text-purple-400" />} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Current Power" value={`8,400 kW`} sub={`of ${CFG.totalCapacityKw.toLocaleString()} kW`} status="ok" icon={<Zap />} />
        <KPICard label="Headroom" value={`${(((CFG.totalCapacityKw-8400)/CFG.totalCapacityKw)*100).toFixed(0)}%`} sub="Power capacity remaining" status="ok" icon={<CheckCircle />} />
        <KPICard label="Capacity Alert" value={breachMonth?.month ?? 'None'} sub="Projected breach" status={breachMonth?'warn':'ok'} icon={<AlertTriangle />} />
        <KPICard label="Proj. Storage" value={`${(lastMonth.storage_tb/1000).toFixed(0)} PB`} sub="In 12 months" status="ok" icon={<HardDrive />} />
      </div>

      <Tabs tabs={['Power Forecast','Rack Utilisation','Storage Growth','Recommendations']}>
        {[<PowerForecast />, <RackUtilisation />, <StorageGrowth />, <Recommendations />]}
      </Tabs>
    </div>
  )
}
