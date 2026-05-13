import { useState } from 'react'
import { Zap, Play, CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown, ChevronRight, Shield, Cpu, Wifi, Thermometer } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { PLAYBOOKS, AUTOMATION_HISTORY } from '../data/engine'
import { PageHeader, Severity, KPICard, SimpleTabs as Tabs, Btn, Modal } from '../components/shared'

const CAT_ICONS: Record<string,any> = { cooling: Thermometer, power: Zap, compute: Cpu, security: Shield, network: Wifi }
const CAT_COLORS: Record<string,string> = {
  cooling:'text-cyan-400 bg-cyan-900/20 border-cyan-800/40',
  power:'text-yellow-400 bg-yellow-900/20 border-yellow-800/40',
  compute:'text-purple-400 bg-purple-900/20 border-purple-800/40',
  security:'text-red-400 bg-red-900/20 border-red-800/40',
  network:'text-blue-400 bg-blue-900/20 border-blue-800/40',
}

function PlaybookCard({ pb, onRun }: { pb: any, onRun: (pb: any) => void }) {
  const [open, setOpen] = useState(false)
  const Icon = CAT_ICONS[pb.category] ?? Zap
  return (
    <div className={`card border ${CAT_COLORS[pb.category]} transition-all`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${CAT_COLORS[pb.category]} shrink-0`}><Icon className="w-4 h-4" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-white text-sm">{pb.name}</h3>
            <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${CAT_COLORS[pb.category]}`}>{pb.category}</span>
            {pb.requires_approval && <span className="text-xs px-1.5 py-0.5 rounded font-mono bg-orange-900/30 text-orange-400 border border-orange-700/40">APPROVAL REQUIRED</span>}
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">Trigger: {pb.trigger}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
            <span><span className="text-white font-mono">{pb.runs}</span> runs</span>
            <span><span className="text-green-400 font-mono">{pb.success_rate}%</span> success</span>
            <span>avg <span className="text-white font-mono">{pb.avg_duration_min}min</span></span>
            <span className="text-slate-500">Last: {formatDistanceToNow(new Date(pb.last_run), {addSuffix:true})}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setOpen(o => !o)} className="p-1.5 rounded hover:bg-slate-700 text-slate-400">
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <Btn size="sm" onClick={() => onRun(pb)}>
            <Play className="w-3.5 h-3.5" /> Run
          </Btn>
        </div>
      </div>
      {open && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">Execution Steps</p>
          <ol className="space-y-1">
            {pb.steps.map((s: string, i: number) => (
              <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                <span className="w-5 h-5 rounded-full bg-slate-700 text-xs flex items-center justify-center font-mono text-slate-400 shrink-0">{i+1}</span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

function ExecutionModal({ pb, onClose }: { pb: any, onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [status, setStatus] = useState<'idle'|'running'|'approval'|'done'|'failed'>('idle')
  const [log, setLog] = useState<string[]>([])

  const execute = () => {
    if (pb.requires_approval && status === 'idle') { setStatus('approval'); return }
    setStatus('running')
    const addLog = (msg: string) => setLog(l => [...l, `[${new Date().toLocaleTimeString()}] ${msg}`])
    addLog(`Initiating playbook: ${pb.name}`)
    pb.steps.forEach((s: string, i: number) => {
      setTimeout(() => {
        setStep(i + 1)
        addLog(`Step ${i+1}: ${s} — OK`)
        if (i === pb.steps.length - 1) {
          setTimeout(() => {
            addLog(`✓ Playbook completed in ${pb.avg_duration_min}min`)
            setStatus('done')
          }, 600)
        }
      }, (i + 1) * 900)
    })
  }

  return (
    <Modal title={`Execute: ${pb.name}`} onClose={onClose}>
      <div className="space-y-4">
        {status === 'idle' && (
          <div>
            <p className="text-sm text-slate-300 mb-3">About to execute <strong className="text-white">{pb.name}</strong> across the infrastructure.</p>
            <div className="bg-slate-800/60 rounded p-3 mb-4 space-y-1 text-xs font-mono text-slate-300">
              <div><span className="text-slate-500">Trigger condition:</span> {pb.trigger}</div>
              <div><span className="text-slate-500">Est. duration:</span> {pb.avg_duration_min} min</div>
              <div><span className="text-slate-500">Historical success rate:</span> {pb.success_rate}%</div>
              {pb.requires_approval && <div className="text-orange-400">⚠ This playbook requires supervisor approval</div>}
            </div>
            <Btn onClick={execute} className="w-full justify-center"><Play className="w-4 h-4" />{pb.requires_approval ? 'Request Approval & Execute' : 'Execute Now'}</Btn>
          </div>
        )}
        {status === 'approval' && (
          <div className="text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-orange-400 mx-auto" />
            <p className="text-sm text-slate-300">Approval request sent to <strong className="text-white">admin@dvt.io</strong></p>
            <p className="text-xs text-slate-400">Simulating approval…</p>
            <Btn onClick={execute} className="w-full justify-center">Approve & Execute (demo)</Btn>
          </div>
        )}
        {status === 'running' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-300">Executing step {step} of {pb.steps.length}…</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 transition-all duration-500" style={{width:`${(step/pb.steps.length)*100}%`}} />
            </div>
            <div className="bg-slate-900 rounded p-3 font-mono text-xs text-green-400 max-h-48 overflow-y-auto space-y-0.5">
              {log.map((l,i) => <div key={i}>{l}</div>)}
            </div>
          </div>
        )}
        {status === 'done' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">Playbook completed successfully</span>
            </div>
            <div className="bg-slate-900 rounded p-3 font-mono text-xs text-green-400 max-h-48 overflow-y-auto space-y-0.5">
              {log.map((l,i) => <div key={i}>{l}</div>)}
            </div>
            <Btn variant="ghost" onClick={onClose} className="w-full justify-center">Close</Btn>
          </div>
        )}
      </div>
    </Modal>
  )
}

function HistoryTable() {
  return (
    <div className="card">
      <h3 className="font-semibold text-white mb-4">Execution History</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-slate-800">
            {['Playbook','Triggered','Resource','Duration','Status','Approved By'].map(h => (
              <th key={h} className="text-left py-2 px-3 text-slate-500 font-medium">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {AUTOMATION_HISTORY.map(h => (
              <tr key={h.id} className="border-b border-slate-800/40 hover:bg-slate-800/30">
                <td className="py-2 px-3 text-white font-medium">{h.playbook_name}</td>
                <td className="py-2 px-3 text-slate-400 font-mono">{format(new Date(h.triggered_at), 'dd/MM HH:mm')}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{h.affected_resource}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{h.duration_min}min</td>
                <td className="py-2 px-3">
                  {h.status === 'success'
                    ? <span className="flex items-center gap-1 text-green-400"><CheckCircle className="w-3.5 h-3.5" />Success</span>
                    : <span className="flex items-center gap-1 text-red-400"><XCircle className="w-3.5 h-3.5" />Failed</span>}
                </td>
                <td className="py-2 px-3 text-slate-500">{h.approved_by ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function AutomationEngine() {
  const [runModal, setRunModal] = useState<any>(null)
  const totalRuns = PLAYBOOKS.reduce((s, p) => s + p.runs, 0)
  const avgSuccess = (PLAYBOOKS.reduce((s, p) => s + p.success_rate, 0) / PLAYBOOKS.length).toFixed(1)
  const pendingApproval = PLAYBOOKS.filter(p => p.requires_approval).length

  return (
    <div>
      <PageHeader title="Automation Engine" subtitle="Human-in-the-loop playbooks · Approval workflows · Execution history"
        icon={<Zap className="w-5 h-5 text-yellow-400" />} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Active Playbooks" value={PLAYBOOKS.length} sub="All systems" status="ok" icon={<Zap />} />
        <KPICard label="Total Executions" value={totalRuns.toLocaleString()} sub="All time" status="ok" icon={<Play />} />
        <KPICard label="Avg Success Rate" value={`${avgSuccess}%`} sub="Across all playbooks" status="ok" icon={<CheckCircle />} />
        <KPICard label="Pending Approval" value={pendingApproval} sub="Require sign-off" status={pendingApproval>0?'warn':'ok'} icon={<Clock />} />
      </div>
      <Tabs tabs={['Playbooks','Execution History']}>
        {[
          <div className="space-y-3">
            {PLAYBOOKS.map(pb => <PlaybookCard key={pb.id} pb={pb} onRun={setRunModal} />)}
          </div>,
          <HistoryTable />
        ]}
      </Tabs>
      {runModal && <ExecutionModal pb={runModal} onClose={() => setRunModal(null)} />}
    </div>
  )
}
