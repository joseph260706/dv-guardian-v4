import { useState, useMemo } from 'react'
import { Server, Search, Filter, Download, Package, Cpu, Wifi, HardDrive, Zap, Thermometer, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { DEVICES, RACKS, HALLS, DEVICE_SPECS } from '../data/engine'
import { PageHeader, KPICard, Severity, Btn, SimpleTabs as Tabs } from '../components/shared'

const CAT_ICONS: Record<string,any> = { server:Cpu, gpu:Cpu, switch:Wifi, storage:HardDrive, ups:Zap, cooling:Thermometer }
const CAT_COLORS: Record<string,string> = {
  server:'text-blue-400', gpu:'text-purple-400', switch:'text-cyan-400',
  storage:'text-green-400', ups:'text-yellow-400', cooling:'text-orange-400',
}
const STATUS_ICON: Record<string,any> = { online:CheckCircle, degraded:AlertTriangle, offline:XCircle }
const STATUS_COLOR: Record<string,string> = { online:'text-green-400', degraded:'text-yellow-400', offline:'text-red-400' }

function DeviceTable({ devices }: { devices: any[] }) {
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expanded, setExpanded] = useState<string|null>(null)

  const rackMap = useMemo(() => Object.fromEntries(RACKS.map(r => [r.id, r])), [])
  const hallMap = useMemo(() => Object.fromEntries(HALLS.map(h => [h.id, h])), [])

  const filtered = useMemo(() => {
    return devices.filter(d => {
      const rack = rackMap[d.rack_id]
      const matchSearch = search === '' ||
        d.spec.model.toLowerCase().includes(search.toLowerCase()) ||
        d.spec.mfr.toLowerCase().includes(search.toLowerCase()) ||
        d.asset_tag.toLowerCase().includes(search.toLowerCase()) ||
        d.serial.toLowerCase().includes(search.toLowerCase()) ||
        rack?.label.toLowerCase().includes(search.toLowerCase())
      const matchCat = catFilter === 'all' || d.spec.cat === catFilter
      const matchStatus = statusFilter === 'all' || d.status === statusFilter
      return matchSearch && matchCat && matchStatus
    })
  }, [devices, search, catFilter, statusFilter, rackMap])

  const exportCSV = () => {
    const rows = filtered.map(d => {
      const rack = rackMap[d.rack_id]
      const hall = hallMap[rack?.hall_id]
      return [d.asset_tag, d.serial, d.spec.mfr, d.spec.model, d.spec.cat, rack?.label, hall?.name, d.status, d.workload].join(',')
    })
    const csv = ['Asset Tag,Serial,Manufacturer,Model,Category,Rack,Hall,Status,Workload', ...rows].join('\n')
    const blob = new Blob([csv], {type:'text/csv'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `asset-inventory-${format(new Date(),'yyyyMMdd')}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by model, asset tag, serial, rack…"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-600" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2">
          <option value="all">All Categories</option>
          {['server','gpu','switch','storage','ups','cooling'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2">
          <option value="all">All Status</option>
          <option value="online">Online</option>
          <option value="degraded">Degraded</option>
          <option value="offline">Offline</option>
        </select>
        <Btn size="sm" variant="ghost" onClick={exportCSV}><Download className="w-3.5 h-3.5" />Export</Btn>
        <span className="text-xs text-slate-500 font-mono">{filtered.length} assets</span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <tr className="border-b border-slate-800">
                {['Category','Manufacturer / Model','Asset Tag','Serial','Location','Slot','Status','Workload'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-slate-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map(d => {
                const rack = rackMap[d.rack_id]
                const hall = hallMap[rack?.hall_id]
                const Icon = CAT_ICONS[d.spec.cat] ?? Server
                const StatusIcon = STATUS_ICON[d.status] ?? CheckCircle
                const isOpen = expanded === d.id
                return (
                  <>
                    <tr key={d.id} className="border-b border-slate-800/40 hover:bg-slate-800/30 cursor-pointer"
                      onClick={() => setExpanded(isOpen ? null : d.id)}>
                      <td className="py-2 px-3">
                        <span className={`flex items-center gap-1.5 ${CAT_COLORS[d.spec.cat]}`}>
                          <Icon className="w-3.5 h-3.5" />{d.spec.cat}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="text-white font-medium">{d.spec.mfr}</div>
                        <div className="text-slate-400">{d.spec.model}</div>
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-300">{d.asset_tag}</td>
                      <td className="py-2 px-3 font-mono text-slate-400">{d.serial}</td>
                      <td className="py-2 px-3 text-slate-300">{hall?.name} / <span className="font-mono">{rack?.label}</span></td>
                      <td className="py-2 px-3 font-mono text-slate-400">U{d.slot}–U{d.slot + d.spec.u - 1}</td>
                      <td className="py-2 px-3">
                        <span className={`flex items-center gap-1 ${STATUS_COLOR[d.status]}`}>
                          <StatusIcon className="w-3 h-3" />{d.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400">{d.workload}</td>
                    </tr>
                    {isOpen && (
                      <tr key={`${d.id}-detail`} className="bg-slate-800/30 border-b border-slate-700/30">
                        <td colSpan={8} className="px-5 py-3">
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-1 text-xs">
                            {d.spec.cpu && <span><span className="text-slate-500">CPU:</span> {d.spec.cpu} ({d.spec.cores} cores)</span>}
                            {d.spec.ram && <span><span className="text-slate-500">RAM:</span> {d.spec.ram} GB</span>}
                            {d.spec.gpu && <span><span className="text-slate-500">GPU:</span> {d.spec.gpu_count}× {d.spec.gpu} ({d.spec.gpu_vram} GB)</span>}
                            {d.spec.ports && <span><span className="text-slate-500">Ports:</span> {d.spec.ports}× {d.spec.speed}GbE</span>}
                            {d.spec.cap_tb && <span><span className="text-slate-500">Capacity:</span> {d.spec.cap_tb} TB</span>}
                            {d.spec.kva && <span><span className="text-slate-500">Power:</span> {d.spec.kva} kVA</span>}
                            <span><span className="text-slate-500">TDP:</span> {(d.spec.tdp/1000).toFixed(1)} kW</span>
                            <span><span className="text-slate-500">Form Factor:</span> {d.spec.u > 0 ? `${d.spec.u}U` : 'Floor-mount'}</span>
                            <span><span className="text-slate-500">Warranty expires:</span> {format(addDays(new Date(), Math.floor(Math.random()*1000+30)), 'dd MMM yyyy')}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function InventorySummary() {
  const byCategory = DEVICES.reduce((acc, d) => {
    acc[d.spec.cat] = (acc[d.spec.cat] || 0) + 1
    return acc
  }, {} as Record<string,number>)

  const byStatus = DEVICES.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1
    return acc
  }, {} as Record<string,number>)

  const byMfr = DEVICES.reduce((acc, d) => {
    acc[d.spec.mfr] = (acc[d.spec.mfr] || 0) + 1
    return acc
  }, {} as Record<string,number>)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="card">
        <h3 className="font-semibold text-white mb-3">By Category</h3>
        <div className="space-y-2">
          {Object.entries(byCategory).map(([cat, count]) => {
            const Icon = CAT_ICONS[cat] ?? Server
            const pct = Math.round((count / DEVICES.length) * 100)
            return (
              <div key={cat}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className={`flex items-center gap-1.5 ${CAT_COLORS[cat]}`}><Icon className="w-3.5 h-3.5" />{cat}</span>
                  <span className="font-mono text-white">{count}</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full"><div className="h-full bg-cyan-500/70 rounded-full" style={{width:`${pct}%`}} /></div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="card">
        <h3 className="font-semibold text-white mb-3">By Status</h3>
        <div className="space-y-3">
          {Object.entries(byStatus).map(([status, count]) => {
            const Icon = STATUS_ICON[status] ?? CheckCircle
            return (
              <div key={status} className="flex items-center justify-between">
                <span className={`flex items-center gap-2 text-sm ${STATUS_COLOR[status]}`}><Icon className="w-4 h-4" />{status}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-white text-sm">{count}</span>
                  <span className="text-xs text-slate-500">({Math.round(count/DEVICES.length*100)}%)</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="card">
        <h3 className="font-semibold text-white mb-3">By Manufacturer</h3>
        <div className="space-y-2">
          {Object.entries(byMfr).sort((a,b)=>b[1]-a[1]).map(([mfr, count]) => (
            <div key={mfr} className="flex items-center justify-between text-sm">
              <span className="text-slate-300">{mfr}</span>
              <span className="font-mono text-white">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AssetManager() {
  const online = DEVICES.filter(d => d.status === 'online').length
  const degraded = DEVICES.filter(d => d.status === 'degraded').length

  return (
    <div>
      <PageHeader title="Asset Manager" subtitle="Full device inventory · Lifecycle tracking · Hardware catalog"
        icon={<Package className="w-5 h-5 text-green-400" />} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Total Assets" value={DEVICES.length.toLocaleString()} sub="Across all halls" status="ok" icon={<Server />} />
        <KPICard label="Online" value={online.toLocaleString()} sub="Operational" status="ok" icon={<CheckCircle />} />
        <KPICard label="Degraded" value={degraded} sub="Needs attention" status={degraded>0?'warn':'ok'} icon={<AlertTriangle />} />
        <KPICard label="Device Types" value={DEVICE_SPECS.length} sub="Hardware catalog" status="ok" icon={<Package />} />
      </div>
      <Tabs tabs={['Device Inventory','Inventory Summary']}>
        {[<DeviceTable devices={DEVICES} />, <InventorySummary />]}
      </Tabs>
    </div>
  )
}
