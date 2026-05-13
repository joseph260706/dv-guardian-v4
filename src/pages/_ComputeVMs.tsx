import { useState } from 'react'
import { Cpu, Server, Activity, AlertTriangle, CheckCircle, RefreshCw, HardDrive } from 'lucide-react'
import { PageHeader, KPICard, SimpleTabs as Tabs, Severity } from '../components/shared'
import { RACKS, DEVICES } from '../data/engine'

const rand = (a: number, b: number) => +(Math.random() * (b - a) + a).toFixed(1)
const randInt = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a

const K8S_CLUSTERS = [
  {
    name:'prod-k8s-01', nodes:12, ready:12, version:'1.30.2',
    cpu_req:68, cpu_cap:100, mem_req:74, mem_cap:100,
    pods:{ running:284, pending:3, failed:1, total:288 },
    namespaces:['production','monitoring','ingress-nginx','cert-manager','kube-system'],
  },
  {
    name:'ml-training-01', nodes:8, ready:8, version:'1.30.2',
    cpu_req:88, cpu_cap:100, mem_req:91, mem_cap:100,
    pods:{ running:44, pending:0, failed:0, total:44 },
    namespaces:['ml-training','gpu-operator','monitoring'],
  },
  {
    name:'dev-k8s-01', nodes:4, ready:3, version:'1.29.6',
    cpu_req:35, cpu_cap:100, mem_req:42, mem_cap:100,
    pods:{ running:68, pending:12, failed:4, total:84 },
    namespaces:['development','staging','testing'],
  },
]

const VMWARE = {
  vcenter:'vc-lon-01.dvt.io', version:'8.0 U2b',
  clusters:[
    { name:'compute-cluster-a', hosts:8, cpuGHz:128, cpuUsed:76, memGB:2048, memUsed:71, vms:142, datastores:4 },
    { name:'gpu-cluster-b', hosts:6, cpuGHz:96, cpuUsed:89, memGB:3072, memUsed:82, vms:28, datastores:2 },
    { name:'mgmt-cluster', hosts:3, cpuGHz:48, cpuUsed:34, memGB:512, memUsed:48, vms:36, datastores:2 },
  ]
}

function K8sView() {
  const [selected, setSelected] = useState(0)
  const cl = K8S_CLUSTERS[selected]

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {K8S_CLUSTERS.map((c, i) => (
          <button key={c.name} onClick={() => setSelected(i)}
            className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-all ${selected===i?'bg-blue-900/40 text-blue-400 border border-blue-700/50':'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold font-mono text-white">{cl.nodes}</div>
          <div className="text-xs text-slate-400">Nodes</div>
          <div className="text-xs mt-1" style={{color: cl.ready===cl.nodes?'#4ade80':'#facc15'}}>{cl.ready} Ready</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold font-mono text-white">{cl.pods.running}</div>
          <div className="text-xs text-slate-400">Running Pods</div>
          <div className="text-xs mt-1" style={{color: cl.pods.failed>0?'#f87171':'#4ade80'}}>{cl.pods.pending} pending · {cl.pods.failed} failed</div>
        </div>
        <div className="card text-center">
          <div className={`text-2xl font-bold font-mono ${cl.cpu_req>85?'text-orange-400':'text-white'}`}>{cl.cpu_req}%</div>
          <div className="text-xs text-slate-400">CPU Requested</div>
        </div>
        <div className="card text-center">
          <div className={`text-2xl font-bold font-mono ${cl.mem_req>85?'text-orange-400':'text-white'}`}>{cl.mem_req}%</div>
          <div className="text-xs text-slate-400">Memory Requested</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-white mb-3">Node Pool Status</h3>
          <div className="space-y-2">
            {Array.from({length: cl.nodes}, (_,i) => {
              const cpu = rand(30,98), mem = rand(40,92)
              const status = cl.ready > i ? (cpu > 90 || mem > 90 ? 'warn' : 'ok') : 'notready'
              return (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${status==='ok'?'bg-green-400':status==='warn'?'bg-yellow-400 animate-pulse':'bg-red-400'}`} />
                  <span className="font-mono text-slate-300 w-28">node-{String(i+1).padStart(3,'0')}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-slate-500 w-6">CPU</span>
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full"><div className="h-full rounded-full" style={{width:`${cpu}%`,background:cpu>85?'#f97316':'#06b6d4'}} /></div>
                    <span className="font-mono w-10 text-right" style={{color:cpu>85?'#f97316':'#94a3b8'}}>{cpu}%</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-slate-500 w-6">MEM</span>
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full"><div className="h-full rounded-full" style={{width:`${mem}%`,background:mem>85?'#f97316':'#8b5cf6'}} /></div>
                    <span className="font-mono w-10 text-right" style={{color:mem>85?'#f97316':'#94a3b8'}}>{mem}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-white mb-3">Namespaces</h3>
          <div className="space-y-2">
            {cl.namespaces.map(ns => {
              const pods = randInt(4, 60), running = randInt(Math.floor(pods*0.85), pods)
              return (
                <div key={ns} className="flex items-center gap-3 text-sm">
                  <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                  <span className="font-mono text-slate-300 flex-1">{ns}</span>
                  <span className="text-xs text-slate-500">{running}/{pods} pods</span>
                  <span className="text-xs font-mono text-slate-400">{rand(0,8)}m CPU</span>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800">
            <div className="text-xs text-slate-500 flex justify-between">
              <span>Cluster version</span><span className="font-mono text-slate-300">{cl.version}</span>
            </div>
            <div className="text-xs text-slate-500 flex justify-between mt-1">
              <span>Total pods</span><span className="font-mono text-slate-300">{cl.pods.total}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function VMwareView() {
  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-white">VMware vCenter — {VMWARE.vcenter}</h3>
            <p className="text-xs text-slate-400">vSphere {VMWARE.version}</p>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-green-400 font-mono bg-green-900/20 border border-green-800/40 px-2 py-1 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />CONNECTED
          </span>
        </div>
        {VMWARE.clusters.map(cl => (
          <div key={cl.name} className="mb-5 last:mb-0">
            <div className="flex items-center gap-2 mb-2">
              <Server className="w-4 h-4 text-blue-400" />
              <span className="font-medium text-white text-sm">{cl.name}</span>
              <span className="text-xs text-slate-500 ml-auto">{cl.hosts} hosts · {cl.vms} VMs</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1"><span>CPU ({cl.cpuGHz} GHz total)</span><span className={cl.cpuUsed>85?'text-orange-400':'text-slate-300'}>{cl.cpuUsed}%</span></div>
                <div className="h-2 bg-slate-700 rounded-full"><div className="h-full rounded-full transition-all" style={{width:`${cl.cpuUsed}%`,background:cl.cpuUsed>85?'#f97316':'#06b6d4'}} /></div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1"><span>Memory ({cl.memGB} GB total)</span><span className={cl.memUsed>85?'text-orange-400':'text-slate-300'}>{cl.memUsed}%</span></div>
                <div className="h-2 bg-slate-700 rounded-full"><div className="h-full rounded-full transition-all" style={{width:`${cl.memUsed}%`,background:cl.memUsed>85?'#f97316':'#8b5cf6'}} /></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="font-semibold text-white mb-3">VM Inventory Sample</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-slate-800">
              {['VM Name','Host','vCPUs','RAM (GB)','CPU%','Status'].map(h => (
                <th key={h} className="text-left py-2 px-3 text-slate-500 font-medium">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {[
                ['prod-api-01','esx-01',8,32,rand(20,65),'running'],
                ['prod-api-02','esx-02',8,32,rand(18,60),'running'],
                ['prod-db-01','esx-03',16,128,rand(35,75),'running'],
                ['prod-db-02','esx-04',16,128,rand(40,80),'running'],
                ['monitoring-01','esx-01',4,16,rand(10,30),'running'],
                ['backup-01','esx-05',4,8,rand(5,15),'running'],
                ['dev-test-01','esx-06',2,4,rand(2,8),'running'],
                ['dev-test-02','esx-06',2,4,rand(0,5),'suspended'],
              ].map(([name,host,cpu,ram,util,status],i) => (
                <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-800/30">
                  <td className="py-2 px-3 font-mono text-white">{name}</td>
                  <td className="py-2 px-3 font-mono text-slate-400">{host}</td>
                  <td className="py-2 px-3 font-mono text-slate-300">{cpu}</td>
                  <td className="py-2 px-3 font-mono text-slate-300">{ram}</td>
                  <td className="py-2 px-3 font-mono" style={{color: Number(util)>80?'#f97316':'#94a3b8'}}>{util}%</td>
                  <td className="py-2 px-3"><span className={`flex items-center gap-1 ${status==='running'?'text-green-400':'text-yellow-400'}`}><span className={`w-1.5 h-1.5 rounded-full ${status==='running'?'bg-green-400':'bg-yellow-400'}`}/>{status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function ComputeVMs() {
  const totalVMs = VMWARE.clusters.reduce((s,c) => s+c.vms, 0)
  const totalPods = K8S_CLUSTERS.reduce((s,c) => s+c.pods.running, 0)
  const failedPods = K8S_CLUSTERS.reduce((s,c) => s+c.pods.failed, 0)
  const k8sNodes = K8S_CLUSTERS.reduce((s,c) => s+c.nodes, 0)

  return (
    <div>
      <PageHeader title="Compute & VMs" subtitle="Kubernetes cluster health · VMware vSphere · VM inventory"
        icon={<Cpu className="w-5 h-5 text-purple-400" />} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="K8s Clusters" value={K8S_CLUSTERS.length} sub={`${k8sNodes} nodes total`} status="ok" icon={<Activity />} />
        <KPICard label="Running Pods" value={totalPods} sub={failedPods>0?`${failedPods} failed`:'All healthy'} status={failedPods>0?'warn':'ok'} icon={<CheckCircle />} />
        <KPICard label="Virtual Machines" value={totalVMs} sub="vSphere managed" status="ok" icon={<Server />} />
        <KPICard label="Physical Hosts" value={VMWARE.clusters.reduce((s,c)=>s+c.hosts,0)} sub="ESXi hypervisors" status="ok" icon={<HardDrive />} />
      </div>
      <Tabs tabs={['Kubernetes','VMware vSphere']}>
        {[<K8sView />, <VMwareView />]}
      </Tabs>
    </div>
  )
}
