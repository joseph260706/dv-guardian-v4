import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, Lock, Eye, Activity, Server, Wifi, CheckCircle, XCircle, Clock, Download, RefreshCw, ChevronDown, ChevronRight, Zap } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { SECURITY_EVENTS, COMPLIANCE_CHECKS, uid } from '../data/engine'
import { PageHeader, Severity, SimpleTabs as Tabs, KPICard, Btn } from '../components/shared'

const SEV_COLORS: Record<string, string> = {
  critical: 'text-red-400 bg-red-900/20 border-red-700/40',
  high: 'text-orange-400 bg-orange-900/20 border-orange-700/40',
  medium: 'text-yellow-400 bg-yellow-900/20 border-yellow-700/40',
  low: 'text-blue-400 bg-blue-900/20 border-blue-700/40',
  info: 'text-slate-400 bg-slate-800/50 border-slate-700/40',
}

const TYPE_ICONS: Record<string, any> = {
  BRUTE_FORCE_ATTEMPT: Lock, PORT_SCAN: Wifi, ANOMALOUS_ACCESS: Eye,
  PRIVILEGE_ESCALATION: AlertTriangle, LATERAL_MOVEMENT: Activity,
  CERT_EXPIRY_WARNING: Clock, CONFIG_CHANGE: Server,
  LOGIN_SUCCESS: CheckCircle, LOGIN_FAILED: XCircle, API_ABUSE: Zap,
}

function ThreatFeed() {
  const [events, setEvents] = useState(SECURITY_EVENTS)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [live, setLive] = useState(true)

  useEffect(() => {
    if (!live) return
    const iv = setInterval(() => {
      const types = Object.keys(TYPE_ICONS)
      const t = types[Math.floor(Math.random() * types.length)]
      setEvents(prev => [{
        id: uid(), type: t,
        severity: ['critical','high','medium','low','info'][Math.floor(Math.random() * 4)],
        source_ip: `${Math.floor(Math.random()*200)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*254)+1}`,
        target: ['management-console','api-gateway','auth-service','ssh'][Math.floor(Math.random()*4)],
        timestamp: new Date().toISOString(),
        mitigated: Math.random() > 0.35,
        description: SECURITY_EVENTS.find(e => e.type === t)?.description ?? 'Security event detected',
      }, ...prev.slice(0, 49)])
    }, 7000)
    return () => clearInterval(iv)
  }, [live])

  const filtered = filter === 'all' ? events
    : filter === 'unmitigated' ? events.filter(e => !e.mitigated)
    : events.filter(e => e.severity === filter)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Live Threat Feed</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setLive(a => !a)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono border ${live ? 'bg-green-900/30 text-green-400 border-green-700/50' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
            {live ? 'LIVE' : 'PAUSED'}
          </button>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1.5">
            <option value="all">All Events</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="unmitigated">Unmitigated Only</option>
          </select>
        </div>
      </div>
      <div className="space-y-1 max-h-[520px] overflow-y-auto pr-1">
        {filtered.slice(0, 30).map(ev => {
          const Icon = TYPE_ICONS[ev.type] ?? Shield
          const isOpen = expanded === ev.id
          return (
            <div key={ev.id} className={`rounded border ${SEV_COLORS[ev.severity]} transition-all`}>
              <button className="w-full flex items-center gap-3 p-2.5 text-left" onClick={() => setExpanded(isOpen ? null : ev.id)}>
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1 text-xs font-mono truncate">{ev.description}</span>
                <span className="text-xs opacity-50 shrink-0 hidden sm:block">{formatDistanceToNow(new Date(ev.timestamp), { addSuffix: true })}</span>
                {ev.mitigated
                  ? <CheckCircle className="w-3 h-3 text-green-400 shrink-0" />
                  : <AlertTriangle className="w-3 h-3 text-orange-400 shrink-0 animate-pulse" />}
                {isOpen ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
              </button>
              {isOpen && (
                <div className="px-4 pb-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs opacity-75 border-t border-white/5 pt-2">
                  <span><span className="text-slate-500">Type:</span> {ev.type}</span>
                  <span><span className="text-slate-500">Source:</span> {ev.source_ip}</span>
                  <span><span className="text-slate-500">Target:</span> {ev.target}</span>
                  <span><span className="text-slate-500">Status:</span> {ev.mitigated ? '✓ Mitigated' : '⚠ Active'}</span>
                  <span className="col-span-2 text-slate-500">{format(new Date(ev.timestamp), 'yyyy-MM-dd HH:mm:ss')}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ComplianceDashboard() {
  const pass = COMPLIANCE_CHECKS.filter(c => c.status === 'pass').length
  const warn = COMPLIANCE_CHECKS.filter(c => c.status === 'warn').length
  const score = Math.round((pass / COMPLIANCE_CHECKS.length) * 100)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[{label:'ISO 27001',pass:3,total:4},{label:'SOC 2',pass:2,total:2},{label:'GDPR',pass:1,total:1},{label:'PCI DSS',pass:1,total:1},{label:'NIST CSF',pass:1,total:1},{label:'Overall',pass,total:COMPLIANCE_CHECKS.length}].map(fw => (
          <div key={fw.label} className="card text-center">
            <div className="text-2xl font-bold font-mono text-white mb-1">{Math.round(fw.pass/fw.total*100)}%</div>
            <div className="text-xs text-slate-400">{fw.label}</div>
            <div className="text-xs mt-1 font-mono" style={{color: fw.pass===fw.total ? '#4ade80' : '#facc15'}}>{fw.pass}/{fw.total} controls</div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 className="font-semibold text-white mb-4">Control Status</h3>
        <div className="space-y-2">
          {COMPLIANCE_CHECKS.map((c, i) => (
            <div key={i} className={`rounded border p-3 ${c.status === 'pass' ? 'border-green-800/40 bg-green-900/10' : 'border-yellow-700/50 bg-yellow-900/20'}`}>
              <div className="flex items-center gap-2 mb-1">
                {c.status === 'pass' ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />}
                <span className="text-sm font-medium text-white">{c.control}</span>
                <span className="ml-auto text-xs text-slate-500 font-mono shrink-0">{c.framework}</span>
              </div>
              <p className="text-xs text-slate-400 ml-6">{c.evidence}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function VulnScanner() {
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const vulns = [
    { id:'CVE-2024-3094', title:'XZ Utils Backdoor', sev:'critical', host:'backup-srv-02', cvss:10.0, fix:'Downgrade to xz 5.4.x' },
    { id:'CVE-2024-1971', title:'OpenSSH Auth Bypass', sev:'critical', host:'mgmt-console-01', cvss:9.8, fix:'Upgrade to OpenSSH 9.7+' },
    { id:'CVE-2024-2140', title:'Linux Kernel Priv-Esc', sev:'high', host:'monitoring-agent', cvss:7.8, fix:'Apply kernel patch 6.8.2' },
    { id:'CVE-2024-4223', title:'Apache Log4j RCE', sev:'medium', host:'api-gateway', cvss:5.5, fix:'Update Log4j to 2.20+' },
    { id:'CVE-2024-5562', title:'TLS Validation Bypass', sev:'low', host:'monitoring-stack', cvss:3.1, fix:'Update SSL library' },
  ]
  const run = () => {
    setRunning(true); setProgress(0)
    const iv = setInterval(() => setProgress(p => { if (p >= 100) { clearInterval(iv); setRunning(false); return 100 } return p + Math.random() * 9 }), 150)
  }
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Vulnerability Scanner</h3>
        <Btn size="sm" onClick={run} disabled={running}><RefreshCw className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />{running ? 'Scanning…' : 'Run Scan'}</Btn>
      </div>
      {running && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Scanning {Math.round(progress * 0.6)}/60 hosts…</span>
            <span>{Math.min(100, Math.round(progress))}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-500 transition-all duration-100 rounded-full" style={{ width: `${Math.min(100, progress)}%` }} />
          </div>
        </div>
      )}
      <div className="space-y-2">
        {vulns.map(v => (
          <div key={v.id} className={`rounded border p-3 ${SEV_COLORS[v.sev]}`}>
            <div className="flex items-center gap-2 mb-1">
              <Severity sev={v.sev} />
              <span className="text-sm font-medium text-white">{v.title}</span>
              <span className="ml-auto text-xs font-mono">CVSS {v.cvss}</span>
            </div>
            <div className="flex justify-between text-xs opacity-70">
              <span className="font-mono">{v.id} · {v.host}</span>
              <span className="text-green-400">→ {v.fix}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FirewallPanel() {
  const rules = [
    { id:'FW-001', name:'Block external SSH', action:'DENY', src:'0.0.0.0/0', dst:'mgmt-vlan', port:'22', hits:14821 },
    { id:'FW-002', name:'Allow NOC HTTPS', action:'ALLOW', src:'10.0.0.0/8', dst:'any', port:'443', hits:892341 },
    { id:'FW-003', name:'Block ICMP flood', action:'RATE-LIMIT', src:'0.0.0.0/0', dst:'any', port:'ICMP', hits:4422 },
    { id:'FW-004', name:'Quarantine segment', action:'DENY', src:'quarantine-vlan', dst:'any', port:'any', hits:0 },
    { id:'FW-005', name:'Allow Prometheus', action:'ALLOW', src:'monitoring-vlan', dst:'any', port:'9090-9100', hits:2103944 },
    { id:'FW-006', name:'Block Tor exit nodes', action:'DENY', src:'tor-blocklist', dst:'any', port:'any', hits:331 },
  ]
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Firewall Rules</h3>
        <span className="text-xs text-slate-500 font-mono">{rules.length} active rules</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-slate-800">
            {['ID','Rule Name','Action','Source','Destination','Port','Hits/24h'].map(h => (
              <th key={h} className="text-left py-2 px-2 text-slate-500 font-medium">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id} className="border-b border-slate-800/40 hover:bg-slate-800/30">
                <td className="py-2 px-2 font-mono text-slate-500">{r.id}</td>
                <td className="py-2 px-2 text-white">{r.name}</td>
                <td className="py-2 px-2">
                  <span className={`px-1.5 py-0.5 rounded font-mono text-xs ${r.action==='ALLOW'?'bg-green-900/40 text-green-400':r.action==='DENY'?'bg-red-900/40 text-red-400':'bg-yellow-900/40 text-yellow-400'}`}>{r.action}</span>
                </td>
                <td className="py-2 px-2 font-mono text-slate-300">{r.src}</td>
                <td className="py-2 px-2 font-mono text-slate-300">{r.dst}</td>
                <td className="py-2 px-2 font-mono text-slate-300">{r.port}</td>
                <td className="py-2 px-2 font-mono text-slate-400">{r.hits.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function SecurityCentre() {
  const unmitigated = SECURITY_EVENTS.filter(e => !e.mitigated).length
  const critical = SECURITY_EVENTS.filter(e => e.severity === 'critical').length
  const compliancePass = COMPLIANCE_CHECKS.filter(c => c.status === 'pass').length
  const score = Math.max(0, 100 - critical * 5 - unmitigated)
  return (
    <div>
      <PageHeader title="Security Centre" subtitle="Threat monitoring · Compliance controls · Vulnerability management"
        icon={<Shield className="w-5 h-5 text-red-400" />}
        actions={<Btn size="sm" variant="ghost"><Download className="w-3.5 h-3.5" />Export Report</Btn>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Security Score" value={`${score}/100`} sub={score>80?'Good posture':'Needs attention'} status={score>80?'ok':score>60?'warn':'crit'} icon={<Shield />} />
        <KPICard label="Active Threats" value={unmitigated} sub={`${critical} critical`} status={unmitigated>5?'crit':unmitigated>2?'warn':'ok'} icon={<AlertTriangle />} />
        <KPICard label="Compliance" value={`${compliancePass}/${COMPLIANCE_CHECKS.length}`} sub="Controls passing" status={compliancePass===COMPLIANCE_CHECKS.length?'ok':'warn'} icon={<CheckCircle />} />
        <KPICard label="Events (24h)" value={SECURITY_EVENTS.length} sub="All systems" status="ok" icon={<Activity />} />
      </div>
      <Tabs tabs={['Threat Feed','Compliance','Vulnerabilities','Firewall']}>
        {[<ThreatFeed />, <ComplianceDashboard />, <VulnScanner />, <FirewallPanel />]}
      </Tabs>
    </div>
  )
}
