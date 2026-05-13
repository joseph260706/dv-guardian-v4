import { useState } from 'react'
import { Plus, ChevronDown, ChevronUp, Brain, Clock, CheckCircle, AlertTriangle, Activity } from 'lucide-react'
import { useIncidentStore, useAuthStore } from '../store'
import { PageHeader, Severity, Btn, Modal, Empty } from '../components/shared'
import { format, formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { uid } from '../data/engine'

const STATUS_COLOR: Record<string,string> = { open:'border-critical/25 bg-critical/5', investigating:'border-warning/25 bg-warning/5', resolved:'border-success/15 bg-success/5' }
const STATUS_ICON: Record<string,React.ReactNode> = { open:<AlertTriangle className="w-3.5 h-3.5 text-critical"/>, investigating:<Clock className="w-3.5 h-3.5 text-warning"/>, resolved:<CheckCircle className="w-3.5 h-3.5 text-success"/> }

export default function IncidentManager() {
  const { incidents, addIncident, updateIncident } = useIncidentStore()
  const { user, addAudit } = useAuthStore()
  const [expanded, setExpanded] = useState<string|null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [rcaLoading, setRcaLoading] = useState<string|null>(null)
  const [newInc, setNewInc] = useState({ title:'', description:'', severity:'medium', affected:'' })
  const [filterStatus, setFilterStatus] = useState('all')

  const filtered = incidents.filter(i => filterStatus === 'all' || i.status === filterStatus)
  const open = incidents.filter(i=>i.status==='open').length
  const inv = incidents.filter(i=>i.status==='investigating').length
  const res = incidents.filter(i=>i.status==='resolved').length

  const handleCreate = () => {
    if (!newInc.title) return toast.error('Title required')
    const inc = { id:`INC-2024-0${Math.floor(Math.random()*999)+860}`, ...newInc, status:'open', priority:3,
      affected_systems: newInc.affected.split(',').map(s=>s.trim()).filter(Boolean),
      blast_radius:{ racks:0, devices:0, services:[] }, timeline:[{ ts:new Date().toISOString(), event:'Incident created', actor:user?.email??'system', type:'creation' }],
      rca:null, created_at:new Date().toISOString(), resolved_at:null, mttr_hours:null, sla_breach:false }
    addIncident(inc)
    addAudit({ user:user?.email??'system', action:'CREATE_INCIDENT', resource:'incidents', severity:'warning', details:inc.title })
    setShowCreate(false); setNewInc({ title:'', description:'', severity:'medium', affected:'' })
    toast.success(`Incident ${inc.id} created`)
  }

  const generateRCA = async (id: string) => {
    setRcaLoading(id); await new Promise(r=>setTimeout(r,1800))
    updateIncident(id, { rca:`## AI Root Cause Analysis\n\n**Generated:** ${new Date().toLocaleString()}\n\n**Primary Cause:** Telemetry correlation across affected systems identifies thermal load as primary contributing factor.\n\n**Contributing Factors:**\n1. Elevated inlet temperature exceeding cooling capacity\n2. Workload density increase in affected zone\n3. Maintenance window missed — CRAC filters overdue\n\n**Recommendations:**\n- Review cooling unit maintenance schedule\n- Implement workload redistribution triggers\n- Schedule preventive CRAC inspection` })
    setRcaLoading(null); toast.success('AI RCA generated')
  }

  const changeStatus = (id: string, status: string) => {
    updateIncident(id, { status, resolved_at: status==='resolved'?new Date().toISOString():null })
    addAudit({ user:user?.email??'system', action:'UPDATE_INCIDENT', resource:'incidents', severity:'info', details:`Status: ${status}` })
    toast.success(`Status updated to ${status}`)
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Incident Manager" sub="AI-assisted incident tracking, root cause analysis, and ITSM workflow" crumbs={['DCIM','Incidents']}
        actions={<Btn variant="primary" size="sm" onClick={()=>setShowCreate(true)}><Plus className="w-3.5 h-3.5"/>New Incident</Btn>} />

      <div className="grid grid-cols-3 gap-3">
        {[{l:'Open',v:open,c:'text-critical'},{l:'Investigating',v:inv,c:'text-warning'},{l:'Resolved',v:res,c:'text-success'}].map(({l,v,c})=>(
          <div key={l} className="card text-center cursor-pointer hover:border-accent/30" onClick={()=>setFilterStatus(l.toLowerCase())}>
            <div className={clsx('font-mono text-3xl font-bold',c)}>{v}</div><div className="text-xs font-mono text-text-secondary mt-1">{l}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-center">
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="input text-xs py-1.5">
          <option value="all">All Incidents</option><option value="open">Open</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option>
        </select>
        <span className="text-xs font-mono text-text-secondary">{filtered.length} incidents</span>
      </div>

      <div className="space-y-3">
        {filtered.map(inc => (
          <div key={inc.id} className={clsx('border rounded-2xl overflow-hidden', STATUS_COLOR[inc.status])}>
            <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={()=>setExpanded(expanded===inc.id?null:inc.id)}>
              {STATUS_ICON[inc.status]}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-text-primary">{inc.title}</span>
                  <Severity sev={inc.severity}/><span className="text-[10px] font-mono text-accent">{inc.id}</span>
                  <span className="text-[10px] font-mono text-text-secondary">{formatDistanceToNow(new Date(inc.created_at),{addSuffix:true})}</span>
                </div>
                <p className="text-[10px] font-mono text-text-secondary mt-0.5 truncate">{inc.description}</p>
                {inc.blast_radius&&<div className="text-[10px] font-mono text-warning mt-0.5">Blast radius: {inc.blast_radius.racks} racks · {inc.blast_radius.devices} devices</div>}
              </div>
              <div className="flex items-center gap-2">
                {inc.status!=='resolved'&&<select value={inc.status} onChange={e=>{e.stopPropagation();changeStatus(inc.id,e.target.value)}} onClick={e=>e.stopPropagation()} className="input text-xs py-1"><option value="open">Open</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option></select>}
                {expanded===inc.id?<ChevronUp className="w-4 h-4 text-text-secondary"/>:<ChevronDown className="w-4 h-4 text-text-secondary"/>}
              </div>
            </div>
            {expanded===inc.id&&(
              <div className="border-t border-border/40 p-4 space-y-4 bg-bg/20">
                <div>
                  <div className="section-title">Timeline</div>
                  <div className="space-y-1.5">
                    {inc.timeline?.map((ev:any,i:number)=>(
                      <div key={i} className="flex gap-3 text-xs font-mono">
                        <span className="text-text-secondary/60 w-32 flex-shrink-0">{format(new Date(ev.ts),'MMM d HH:mm')}</span>
                        <span className={clsx('text-[10px] border rounded px-1.5 py-0.5 flex-shrink-0', ev.type==='detection'?'border-warning/30 text-warning':ev.type==='resolution'?'border-success/30 text-success':'border-border text-text-secondary')}>{ev.type}</span>
                        <span className="text-text-secondary">{ev.event}</span><span className="text-text-secondary/50 ml-auto">{ev.actor}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2"><div className="section-title mb-0">Root Cause Analysis</div>
                    {!inc.rca&&<Btn size="sm" variant="secondary" loading={rcaLoading===inc.id} onClick={()=>generateRCA(inc.id)}><Brain className="w-3.5 h-3.5"/>Generate AI RCA</Btn>}
                  </div>
                  {inc.rca?<pre className="text-xs font-mono text-text-secondary bg-surface rounded-xl p-3 whitespace-pre-wrap leading-relaxed">{inc.rca}</pre>:<p className="text-xs font-mono text-text-secondary/50">No RCA generated. Click above to generate with AI.</p>}
                </div>
                {inc.resolution&&<div><div className="section-title">Resolution</div><p className="text-xs font-mono text-success/80">{inc.resolution}</p></div>}
              </div>
            )}
          </div>
        ))}
        {filtered.length===0&&<Empty msg="No incidents match current filter" icon={<Activity className="w-10 h-10"/>}/>}
      </div>

      <Modal open={showCreate} onClose={()=>setShowCreate(false)} title="Create New Incident">
        <div className="space-y-4">
          <div><label className="text-xs font-mono text-text-secondary block mb-1">Title *</label><input value={newInc.title} onChange={e=>setNewInc(p=>({...p,title:e.target.value}))} className="input w-full" placeholder="Brief incident title"/></div>
          <div><label className="text-xs font-mono text-text-secondary block mb-1">Description</label><textarea value={newInc.description} onChange={e=>setNewInc(p=>({...p,description:e.target.value}))} className="input w-full h-20 resize-none"/></div>
          <div><label className="text-xs font-mono text-text-secondary block mb-1">Severity</label><select value={newInc.severity} onChange={e=>setNewInc(p=>({...p,severity:e.target.value}))} className="input w-full"><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
          <div><label className="text-xs font-mono text-text-secondary block mb-1">Affected Systems (comma-separated)</label><input value={newInc.affected} onChange={e=>setNewInc(p=>({...p,affected:e.target.value}))} className="input w-full" placeholder="Rack A01, CRAC-A2, UPS-B1"/></div>
          <div className="flex gap-2 justify-end pt-2"><Btn variant="secondary" onClick={()=>setShowCreate(false)}>Cancel</Btn><Btn variant="primary" onClick={handleCreate}>Create Incident</Btn></div>
        </div>
      </Modal>
    </div>
  )
}
