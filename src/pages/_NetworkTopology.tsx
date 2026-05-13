import { useState } from 'react'
import { Wifi, ArrowUpDown, AlertTriangle, CheckCircle, Activity } from 'lucide-react'
import { PageHeader, KPICard, SimpleTabs as Tabs } from '../components/shared'
import { HALLS, RACKS } from '../data/engine'

const rand = (a: number, b: number) => +(Math.random() * (b - a) + a).toFixed(1)

const NETWORK = {
  core: [
    { id:'CORE-SW-01', model:'Arista 7504R3', role:'Core Switch A', uplinks:4, speed:400, util:rand(38,62), status:'ok', bgp:'iBGP peer — AS65000' },
    { id:'CORE-SW-02', model:'Arista 7504R3', role:'Core Switch B (redundant)', uplinks:4, speed:400, util:rand(34,58), status:'ok', bgp:'iBGP peer — AS65000' },
  ],
  aggregation: [
    { id:'AGG-A-01', model:'Arista 7050CX3', hall:'Hall A', uplinks:2, downlinks:20, speed:100, util:rand(40,75), status:'ok' },
    { id:'AGG-B-01', model:'Arista 7050CX3', hall:'Hall B', uplinks:2, downlinks:20, speed:100, util:rand(55,88), status:'warn' },
    { id:'AGG-C-01', model:'Arista 7280SR2', hall:'Hall C', uplinks:2, downlinks:20, speed:100, util:rand(30,55), status:'ok' },
  ],
  access: HALLS.map((h, hi) => ({
    hall: h.name, switches: Array.from({length:5}, (_,i) => ({
      id:`ACC-${h.name.split(' ')[1]}-0${i+1}`,
      model:'Cisco 9300-24P',
      ports: 24, util: rand(20,80), status: Math.random()>0.9?'warn':'ok',
    }))
  })),
  uplinks: [
    { id:'UPL-01', provider:'BT Wholesale', type:'Dark Fibre', speed:100, util:rand(30,55), status:'ok', latency_ms:0.8 },
    { id:'UPL-02', provider:'Zayo Networks', type:'MPLS', speed:10, util:rand(10,40), status:'ok', latency_ms:1.2 },
    { id:'UPL-03', provider:'BT Wholesale', type:'Dark Fibre (redundant)', speed:100, util:rand(5,15), status:'ok', latency_ms:0.9 },
  ],
}

const STATUS_DOT: Record<string,string> = { ok:'bg-green-400', warn:'bg-yellow-400 animate-pulse', crit:'bg-red-400 animate-pulse' }

function TopologyDiagram() {
  const [hovered, setHovered] = useState<string|null>(null)
  return (
    <div className="card">
      <h3 className="font-semibold text-white mb-4">Network Fabric — Visual Topology</h3>
      <div className="overflow-x-auto">
        <svg viewBox="0 0 900 520" className="w-full" style={{minWidth:600}}>
          {/* Internet */}
          <rect x="350" y="20" width="200" height="40" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="1.5"/>
          <text x="450" y="44" textAnchor="middle" fill="#94a3b8" fontSize="13" fontFamily="monospace">INTERNET / WAN</text>

          {/* Uplinks */}
          {NETWORK.uplinks.map((u, i) => {
            const x = 120 + i * 280
            return (
              <g key={u.id}>
                <line x1={x+60} y1="80" x2="450" y2="60" stroke="#0e7490" strokeWidth="1.5" strokeDasharray="4 2"/>
                <rect x={x} y="80" width="120" height="50" rx="6" fill="#164e63" stroke="#0e7490" strokeWidth="1.5"/>
                <text x={x+60} y="100" textAnchor="middle" fill="#67e8f9" fontSize="9" fontFamily="monospace">{u.provider}</text>
                <text x={x+60} y="115" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">{u.speed}Gbps · {u.util}% util</text>
                <circle cx={x+110} cy={u.status==='ok'?87:87} r="5" fill={u.status==='ok'?'#4ade80':'#facc15'}/>
              </g>
            )
          })}

          {/* Core switches */}
          {NETWORK.core.map((sw, i) => {
            const x = 250 + i * 200
            return (
              <g key={sw.id} onMouseEnter={() => setHovered(sw.id)} onMouseLeave={() => setHovered(null)}>
                <line x1={x+60} y1="180" x2={i===0?210:420} y2="130" stroke="#1d4ed8" strokeWidth="2"/>
                <rect x={x} y="180" width="120" height="60" rx="8" fill={hovered===sw.id?"#1e3a5f":"#172554"} stroke="#1d4ed8" strokeWidth="2" style={{cursor:'pointer'}}/>
                <text x={x+60} y="205" textAnchor="middle" fill="#93c5fd" fontSize="10" fontFamily="monospace" fontWeight="bold">{sw.id}</text>
                <text x={x+60} y="220" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">{sw.model}</text>
                <text x={x+60} y="233" textAnchor="middle" fill="#4ade80" fontSize="9" fontFamily="monospace">{sw.util}% util</text>
                <circle cx={x+110} cy={187} r="5" fill="#4ade80"/>
              </g>
            )
          })}
          {/* Core interconnect */}
          <line x1="430" y1="210" x2="470" y2="210" stroke="#1d4ed8" strokeWidth="2" strokeDasharray="3 2"/>

          {/* Aggregation */}
          {NETWORK.aggregation.map((sw, i) => {
            const x = 60 + i * 270
            const coreX = i < 2 ? 310 : 470
            return (
              <g key={sw.id} onMouseEnter={() => setHovered(sw.id)} onMouseLeave={() => setHovered(null)}>
                <line x1={x+60} y1="320" x2={coreX} y2="240" stroke="#7c3aed" strokeWidth="1.5"/>
                <rect x={x} y="320" width="120" height="60" rx="6" fill={hovered===sw.id?"#2e1065":"#1e1b4b"} stroke="#7c3aed" strokeWidth="1.5" style={{cursor:'pointer'}}/>
                <text x={x+60} y="344" textAnchor="middle" fill="#c4b5fd" fontSize="10" fontFamily="monospace" fontWeight="bold">{sw.id}</text>
                <text x={x+60} y="357" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">{sw.hall}</text>
                <text x={x+60} y="370" textAnchor="middle" fill={sw.util>80?"#facc15":"#4ade80"} fontSize="9" fontFamily="monospace">{sw.util}% util</text>
                <circle cx={x+110} cy={327} r="5" fill={sw.status==='ok'?'#4ade80':'#facc15'}/>
              </g>
            )
          })}

          {/* Rack access layer (simplified) */}
          {HALLS.map((h, hi) => {
            const x = 60 + hi * 270
            return (
              <g key={h.id}>
                <line x1={x+60} y1="420" x2={x+60} y2="380" stroke="#0f766e" strokeWidth="1.5"/>
                <rect x={x} y="420" width="120" height="55" rx="6" fill="#042f2e" stroke="#0f766e" strokeWidth="1.5"/>
                <text x={x+60} y="441" textAnchor="middle" fill="#5eead4" fontSize="10" fontFamily="monospace" fontWeight="bold">{h.name}</text>
                <text x={x+60} y="455" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">20 racks · 5 ToR sw</text>
                <text x={x+60} y="468" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">25Gbps server links</text>
              </g>
            )
          })}

          {/* Legend */}
          <g transform="translate(730, 20)">
            {[{c:'#0e7490',l:'WAN/Uplink'},{c:'#1d4ed8',l:'Core (400G)'},{c:'#7c3aed',l:'Aggregation (100G)'},{c:'#0f766e',l:'Access (25G)'}].map((item,i)=>(
              <g key={i} transform={`translate(0,${i*20})`}>
                <line x1="0" y1="8" x2="20" y2="8" stroke={item.c} strokeWidth="2"/>
                <text x="25" y="12" fill="#94a3b8" fontSize="10" fontFamily="monospace">{item.l}</text>
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  )
}

function BGPTable() {
  const peers = [
    { as:'AS65000', peer:'10.0.0.1', desc:'Core-SW-01 — iBGP', state:'Established', prefixes:1240, uptime:'47d 12h' },
    { as:'AS65000', peer:'10.0.0.2', desc:'Core-SW-02 — iBGP', state:'Established', prefixes:1240, uptime:'47d 12h' },
    { as:'AS5400', peer:'195.66.236.10', desc:'BT Wholesale', state:'Established', prefixes:892441, uptime:'62d 4h' },
    { as:'AS6461', peer:'80.231.217.14', desc:'Zayo Networks', state:'Established', prefixes:742180, uptime:'62d 4h' },
  ]
  return (
    <div className="card">
      <h3 className="font-semibold text-white mb-4">BGP Routing Table</h3>
      <table className="w-full text-xs">
        <thead><tr className="border-b border-slate-800">
          {['AS Number','Peer IP','Description','State','Prefixes','Uptime'].map(h => (
            <th key={h} className="text-left py-2 px-3 text-slate-500 font-medium">{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {peers.map((p,i) => (
            <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-800/30">
              <td className="py-2 px-3 font-mono text-slate-300">{p.as}</td>
              <td className="py-2 px-3 font-mono text-white">{p.peer}</td>
              <td className="py-2 px-3 text-slate-300">{p.desc}</td>
              <td className="py-2 px-3"><span className="flex items-center gap-1.5 text-green-400"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />{p.state}</span></td>
              <td className="py-2 px-3 font-mono text-slate-300">{p.prefixes.toLocaleString()}</td>
              <td className="py-2 px-3 font-mono text-slate-400">{p.uptime}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InterfaceStats() {
  const ifaces = [
    { name:'et1/1 → CORE-SW-02', speed:'400G', tx:rand(80,220), rx:rand(60,180), errors:0, status:'up' },
    { name:'et2/1 → AGG-A-01', speed:'100G', tx:rand(20,60), rx:rand(15,55), errors:0, status:'up' },
    { name:'et2/2 → AGG-B-01', speed:'100G', tx:rand(50,85), rx:rand(45,80), errors:3, status:'up' },
    { name:'et2/3 → AGG-C-01', speed:'100G', tx:rand(15,40), rx:rand(12,35), errors:0, status:'up' },
    { name:'et3/1 → BT-WAN', speed:'100G', tx:rand(25,50), rx:rand(30,55), errors:0, status:'up' },
    { name:'et3/2 → Zayo-MPLS', speed:'10G', tx:rand(2,8), rx:rand(1,6), errors:0, status:'up' },
  ]
  return (
    <div className="card">
      <h3 className="font-semibold text-white mb-4">Core Switch Interface Statistics</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-slate-800">
            {['Interface','Speed','TX (Gbps)','RX (Gbps)','Errors','Status'].map(h => (
              <th key={h} className="text-left py-2 px-3 text-slate-500 font-medium">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {ifaces.map((f,i) => {
              const txPct = f.tx / parseFloat(f.speed) * 100
              return (
                <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-800/30">
                  <td className="py-2 px-3 font-mono text-white">{f.name}</td>
                  <td className="py-2 px-3 font-mono text-slate-400">{f.speed}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono ${txPct>80?'text-orange-400':'text-slate-300'}`}>{f.tx}</span>
                      <div className="w-16 h-1.5 bg-slate-700 rounded-full"><div className="h-full rounded-full" style={{width:`${Math.min(100,txPct)}%`,background:txPct>80?'#f97316':'#06b6d4'}} /></div>
                    </div>
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-300">{f.rx}</td>
                  <td className="py-2 px-3 font-mono">{f.errors > 0 ? <span className="text-orange-400">{f.errors}</span> : <span className="text-slate-500">0</span>}</td>
                  <td className="py-2 px-3"><span className="flex items-center gap-1.5 text-green-400"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />UP</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function NetworkTopology() {
  const totalSwitches = 2 + 3 + HALLS.length * 5
  const utilWarn = NETWORK.aggregation.filter(s => s.util > 80).length
  return (
    <div>
      <PageHeader title="Network Topology" subtitle="Fabric visualisation · BGP routing · Interface statistics · Uplink monitoring"
        icon={<Wifi className="w-5 h-5 text-blue-400" />} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Network Devices" value={totalSwitches} sub="Switches + uplinks" status="ok" icon={<Wifi />} />
        <KPICard label="WAN Capacity" value="210 Gbps" sub="Aggregate uplink" status="ok" icon={<ArrowUpDown />} />
        <KPICard label="Congestion Alerts" value={utilWarn} sub="Links >80% util" status={utilWarn>0?'warn':'ok'} icon={<AlertTriangle />} />
        <KPICard label="BGP Peers" value={4} sub="All established" status="ok" icon={<CheckCircle />} />
      </div>
      <Tabs tabs={['Topology Map','BGP Routing','Interface Stats']}>
        {[<TopologyDiagram />, <BGPTable />, <InterfaceStats />]}
      </Tabs>
    </div>
  )
}
