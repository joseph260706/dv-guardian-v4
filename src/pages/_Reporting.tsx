import { useState } from 'react'
import { FileText, Download, Calendar, CheckCircle, BarChart2, Leaf, Shield, Zap } from 'lucide-react'
import { format, subDays, subWeeks, subMonths } from 'date-fns'
import { generateReportData, INCIDENTS, PLAYBOOKS, COMPLIANCE_CHECKS, CFG } from '../data/engine'
import { PageHeader, KPICard, Btn } from '../components/shared'

const REPORT_TYPES = [
  { id:'power', label:'Power & Energy', icon: Zap, color:'text-yellow-400', desc:'Total consumption, PUE trends, cost analysis, renewable breakdown' },
  { id:'sustainability', label:'Sustainability', icon: Leaf, color:'text-green-400', desc:'Carbon footprint, PUE efficiency, renewable energy, WUE metrics' },
  { id:'incidents', label:'Incident Report', icon: FileText, color:'text-red-400', desc:'Incident timeline, MTTR, SLA compliance, root cause analysis' },
  { id:'security', label:'Security & Compliance', icon: Shield, color:'text-purple-400', desc:'Threat events, compliance controls, vulnerability status, audit log' },
  { id:'capacity', label:'Capacity Forecast', icon: BarChart2, color:'text-blue-400', desc:'Power growth, rack utilisation, storage trends, procurement signals' },
]

const DATE_PRESETS = [
  { label:'Last 24 hours', fn: () => ({ start: subDays(new Date(),1), end: new Date() }) },
  { label:'Last 7 days', fn: () => ({ start: subWeeks(new Date(),1), end: new Date() }) },
  { label:'Last 30 days', fn: () => ({ start: subMonths(new Date(),1), end: new Date() }) },
  { label:'Last 90 days', fn: () => ({ start: subMonths(new Date(),3), end: new Date() }) },
  { label:'Last 12 months', fn: () => ({ start: subMonths(new Date(),12), end: new Date() }) },
]

function ReportPreview({ type, data, period }: { type: string, data: any, period: any }) {
  const incCount = INCIDENTS.length
  const compPass = COMPLIANCE_CHECKS.filter(c=>c.status==='pass').length

  return (
    <div className="card space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-white text-lg">{CFG.orgName} — DCIM Report</h3>
          <p className="text-sm text-slate-400">{REPORT_TYPES.find(r=>r.id===type)?.label} · {format(period.start,'dd MMM yyyy')} – {format(period.end,'dd MMM yyyy')}</p>
        </div>
        <div className="text-right text-xs text-slate-500 font-mono">
          <div>Generated: {format(new Date(), 'yyyy-MM-dd HH:mm')}</div>
          <div>{CFG.dcName}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 py-4 border-y border-slate-800">
        <div className="text-center">
          <div className="text-2xl font-bold font-mono text-white">{data.summary.avg_pue}</div>
          <div className="text-xs text-slate-400 mt-0.5">Average PUE</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold font-mono text-white">{data.summary.total_kwh.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-0.5">Total kWh</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold font-mono text-white">{data.summary.avg_renewable_pct}%</div>
          <div className="text-xs text-slate-400 mt-0.5">Avg Renewable</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Energy Summary</h4>
          {[
            { k:'Total Consumption', v:`${data.summary.total_kwh.toLocaleString()} kWh` },
            { k:'Energy Cost', v:`£${data.summary.total_cost_gbp.toLocaleString()}` },
            { k:'Average PUE', v:data.summary.avg_pue },
            { k:'Renewable Mix', v:`${data.summary.avg_renewable_pct}%` },
          ].map(r => (
            <div key={r.k} className="flex justify-between text-sm">
              <span className="text-slate-400">{r.k}</span>
              <span className="font-mono text-white">{r.v}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Operations Summary</h4>
          {[
            { k:'Platform Uptime', v:`${data.summary.uptime_pct}%` },
            { k:'Incidents', v:data.summary.incidents },
            { k:'Compliance Controls', v:`${compPass}/${COMPLIANCE_CHECKS.length} passing` },
            { k:'Automation Runs', v:PLAYBOOKS.reduce((s,p)=>s+p.runs,0).toLocaleString() },
          ].map(r => (
            <div key={r.k} className="flex justify-between text-sm">
              <span className="text-slate-400">{r.k}</span>
              <span className="font-mono text-white">{r.v}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Incident Overview</h4>
        <div className="space-y-2">
          {INCIDENTS.map(inc => (
            <div key={inc.id} className="flex items-center gap-3 text-sm bg-slate-800/40 rounded p-2.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${inc.status==='resolved'?'bg-green-400':inc.status==='investigating'?'bg-yellow-400':'bg-red-400'}`} />
              <span className="font-mono text-slate-500 shrink-0">{inc.id}</span>
              <span className="text-white flex-1 truncate">{inc.title}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded font-mono shrink-0 ${inc.status==='resolved'?'bg-green-900/40 text-green-400':'bg-yellow-900/40 text-yellow-400'}`}>{inc.status}</span>
              {inc.mttr_hours && <span className="text-xs text-slate-500 font-mono shrink-0">MTTR {inc.mttr_hours}h</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-800 text-xs text-slate-500 flex justify-between">
        <span>Report ID: RPT-{Date.now().toString().slice(-8)}</span>
        <span>Confidential — Internal Use Only</span>
      </div>
    </div>
  )
}

export default function Reporting() {
  const [type, setType] = useState('power')
  const [preset, setPreset] = useState(1)
  const [generated, setGenerated] = useState(false)
  const [reportData, setReportData] = useState<any>(null)

  const period = DATE_PRESETS[preset].fn()

  const generate = () => {
    const data = generateReportData(type, period.start, period.end)
    setReportData(data)
    setGenerated(true)
  }

  const exportJSON = () => {
    if (!reportData) return
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `dcim-report-${type}-${format(new Date(),'yyyyMMdd')}.json`
    a.click(); URL.revokeObjectURL(url)
  }

  const exportCSV = () => {
    if (!reportData?.records) return
    const headers = Object.keys(reportData.records[0]).join(',')
    const rows = reportData.records.map((r: any) => Object.values(r).join(',')).join('\n')
    const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `dcim-report-${type}-${format(new Date(),'yyyyMMdd')}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader title="Reporting" subtitle="Generate operational reports · Export data · Compliance evidence"
        icon={<FileText className="w-5 h-5 text-blue-400" />} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config panel */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-white mb-3">Report Type</h3>
            <div className="space-y-2">
              {REPORT_TYPES.map(rt => (
                <button key={rt.id} onClick={() => { setType(rt.id); setGenerated(false) }}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${type===rt.id?'border-cyan-600/60 bg-cyan-900/20':'border-slate-700/40 bg-slate-800/30 hover:border-slate-600'}`}>
                  <rt.icon className={`w-4 h-4 mt-0.5 shrink-0 ${rt.color}`} />
                  <div>
                    <div className="text-sm font-medium text-white">{rt.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{rt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" />Date Range</h3>
            <div className="space-y-1.5">
              {DATE_PRESETS.map((p, i) => (
                <button key={i} onClick={() => { setPreset(i); setGenerated(false) }}
                  className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-all ${preset===i?'bg-cyan-900/30 text-cyan-400 border border-cyan-700/40':'text-slate-300 hover:bg-slate-800'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>From:</span><span className="font-mono">{format(period.start,'dd MMM yyyy')}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>To:</span><span className="font-mono">{format(period.end,'dd MMM yyyy')}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Btn onClick={generate} className="w-full justify-center">
              <CheckCircle className="w-4 h-4" /> Generate Report
            </Btn>
            {generated && (
              <>
                <Btn variant="ghost" onClick={exportJSON} className="w-full justify-center">
                  <Download className="w-4 h-4" /> Export JSON
                </Btn>
                <Btn variant="ghost" onClick={exportCSV} className="w-full justify-center">
                  <Download className="w-4 h-4" /> Export CSV
                </Btn>
              </>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="lg:col-span-2">
          {generated && reportData ? (
            <ReportPreview type={type} data={reportData} period={period} />
          ) : (
            <div className="card flex flex-col items-center justify-center text-center h-96 text-slate-500">
              <FileText className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium">Select report type and date range</p>
              <p className="text-sm mt-1">then click Generate Report</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
