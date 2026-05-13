/**
 * DCIM Platform — Enterprise Data Engine
 * Simulates full production telemetry for all platform systems.
 * Every value is derived from realistic data centre operating parameters.
 */

import { subMinutes, subHours, subDays, format, addMinutes } from 'date-fns'

// ── Safe UUID ────────────────────────────────────────────────────────────────
export function uid(): string {
  try { if (crypto?.randomUUID) return crypto.randomUUID() } catch {}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

// ── Math helpers ─────────────────────────────────────────────────────────────
const rand = (a: number, b: number) => Math.random() * (b - a) + a
const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1))
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const noise = (v: number, pct = 0.05) => clamp(v + v * (Math.random() - 0.5) * pct * 2, v * 0.7, v * 1.3)
const diurnal = (h = new Date().getHours()) => 0.5 + 0.5 * Math.sin(Math.PI * (h - 3) / 15)
const wave = (i: number, period: number, amp: number, base: number) =>
  base + amp * Math.sin(2 * Math.PI * i / period) + rand(-amp * 0.1, amp * 0.1)

// ── Configuration (admin-adjustable) ─────────────────────────────────────────
export interface PlatformConfig {
  dcName: string; dcLocation: string; dcTier: number
  totalCapacityKw: number; tariffGbp: number; pueTarget: number
  renewableTarget: number; tempWarning: number; tempCritical: number
  pueWarning: number; pueCritical: number
  refreshIntervalSec: number; currency: string
  orgName: string; orgDomain: string
}

export let CFG: PlatformConfig = {
  dcName: 'DataVault London EDC1', dcLocation: 'Slough, Berkshire, UK', dcTier: 3,
  totalCapacityKw: 12000, tariffGbp: 0.28, pueTarget: 1.3,
  renewableTarget: 60, tempWarning: 35, tempCritical: 40,
  pueWarning: 1.4, pueCritical: 1.6,
  refreshIntervalSec: 5, currency: 'GBP',
  orgName: 'DataVault Technologies', orgDomain: 'dvt.io',
}

export function updateConfig(patch: Partial<PlatformConfig>) { CFG = { ...CFG, ...patch } }

// ── Static Topology ───────────────────────────────────────────────────────────
export const FACILITIES = [
  { id: 'fac-lon', name: 'London EDC1', location: 'Slough, UK', tier: 3, status: 'operational', total_kw: 12000, used_kw: 8400, pue: 1.38, halls: 3, racks: 60 },
  { id: 'fac-ams', name: 'Amsterdam EDC2', location: 'Amsterdam, NL', tier: 3, status: 'operational', total_kw: 8000, used_kw: 5200, pue: 1.31, halls: 2, racks: 40 },
  { id: 'fac-sin', name: 'Singapore EDC3', location: 'Singapore', tier: 4, status: 'operational', total_kw: 6000, used_kw: 3800, pue: 1.42, halls: 2, racks: 30 },
]

export const HALLS = [
  { id: 'hall-a', facility_id: 'fac-lon', name: 'Hall A', cooling: 'CRAC', racks: 20, floor_kw: 4000 },
  { id: 'hall-b', facility_id: 'fac-lon', name: 'Hall B', cooling: 'Hybrid', racks: 20, floor_kw: 4000 },
  { id: 'hall-c', facility_id: 'fac-lon', name: 'Hall C', cooling: 'Liquid', racks: 20, floor_kw: 4000 },
]

export const RACKS: any[] = []
const PREFIXES = ['A','B','C']
HALLS.forEach((hall, hi) => {
  for (let r = 0; r < 20; r++) {
    RACKS.push({
      id: `rack-${hall.id}-${r}`, hall_id: hall.id, label: `${PREFIXES[hi]}${String(r+1).padStart(2,'0')}`,
      total_u: 42, power_cap_kw: 20 + rand(0,15), power_used_kw: 8 + rand(0,18),
      temp_c: 22 + rand(0,8), status: 'normal', row: Math.floor(r/5), col: r%5,
      is_gpu: hall.name === 'Hall B' && r < 10,
    })
  }
})

// Device catalog with real specs
export const DEVICE_SPECS = [
  { id: 'dell-r760', model: 'PowerEdge R760', mfr: 'Dell', cat: 'server', u: 2, tdp: 700, cpu: 'Xeon Gold 6448Y', cores: 64, ram: 4096 },
  { id: 'hpe-dl380', model: 'ProLiant DL380 Gen11', mfr: 'HPE', cat: 'server', u: 2, tdp: 680, cpu: 'Xeon Gold 6430', cores: 64, ram: 2048 },
  { id: 'dgx-h100', model: 'DGX H100', mfr: 'NVIDIA', cat: 'gpu', u: 8, tdp: 10200, cpu: 'Xeon Platinum 8480C', cores: 112, gpu: 'H100 SXM5', gpu_count: 8, gpu_vram: 640 },
  { id: 'dgx-a100', model: 'DGX A100', mfr: 'NVIDIA', cat: 'gpu', u: 6, tdp: 6500, cpu: 'EPYC 7742', cores: 128, gpu: 'A100 80GB', gpu_count: 8, gpu_vram: 640 },
  { id: 'arista-7050', model: 'Arista 7050CX3-32S', mfr: 'Arista', cat: 'switch', u: 1, tdp: 550, ports: 32, speed: 100 },
  { id: 'netapp-a900', model: 'AFF A900', mfr: 'NetApp', cat: 'storage', u: 4, tdp: 1800, cap_tb: 179 },
  { id: 'apc-ups-20k', model: 'Smart-UPS Ultra 20kVA', mfr: 'APC', cat: 'ups', u: 4, tdp: 20000, kva: 20 },
  { id: 'eaton-93pm', model: '93PM 150kVA', mfr: 'Eaton', cat: 'ups', u: 0, tdp: 150000, kva: 150 },
  { id: 'vertiv-dse', model: 'Liebert DSE 085', mfr: 'Vertiv', cat: 'cooling', u: 0, tdp: 28000, cooling_kw: 85 },
]

export const DEVICES: any[] = []
RACKS.forEach(rack => {
  let slot = 1
  // UPS
  const ups = DEVICE_SPECS.find(s => s.id === 'apc-ups-20k')!
  DEVICES.push({ id: uid(), rack_id: rack.id, spec_id: ups.id, spec: ups, slot, status: 'online', workload: 'infrastructure', asset_tag: `AT-${randInt(1000,9999)}`, serial: `SN-${randInt(100000,999999)}` })
  slot += ups.u
  // Switch
  const sw = DEVICE_SPECS.find(s => s.id === 'arista-7050')!
  DEVICES.push({ id: uid(), rack_id: rack.id, spec_id: sw.id, spec: sw, slot, status: 'online', workload: 'network', asset_tag: `AT-${randInt(1000,9999)}`, serial: `SN-${randInt(100000,999999)}` })
  slot += sw.u
  // Compute
  if (rack.is_gpu) {
    const gpu = DEVICE_SPECS.find(s => s.id === 'dgx-a100')!
    if (slot + gpu.u <= 42) {
      DEVICES.push({ id: uid(), rack_id: rack.id, spec_id: gpu.id, spec: gpu, slot, status: 'online', workload: 'ai-training', asset_tag: `AT-${randInt(1000,9999)}`, serial: `SN-${randInt(100000,999999)}` })
      slot += gpu.u
    }
  }
  const srv = DEVICE_SPECS.find(s => s.id === 'dell-r760')!
  while (slot + srv.u <= 40) {
    DEVICES.push({ id: uid(), rack_id: rack.id, spec_id: srv.id, spec: srv, slot, status: Math.random() > 0.03 ? 'online' : 'degraded', workload: rack.is_gpu ? 'ai-inference' : 'standard', asset_tag: `AT-${randInt(1000,9999)}`, serial: `SN-${randInt(100000,999999)}` })
    slot += srv.u
  }
})

// ── Live KPI Generation ───────────────────────────────────────────────────────
let _tick = 0
let _gpuBurst = false
let _anomalyRack: string | null = null
let _incidentActive = false

export function engineTick() {
  _tick++
  if (_tick % 240 === 0) _gpuBurst = !_gpuBurst
  if (_tick % 96 === 0) {
    _anomalyRack = RACKS[randInt(0, RACKS.length-1)].id
    setTimeout(() => { _anomalyRack = null }, 120000)
  }
  if (_tick % 360 === 0) {
    _incidentActive = !_incidentActive
  }
}

export function getLiveKPIs(facility = 'fac-lon') {
  const d = diurnal(), t = _tick
  const pue = clamp(noise(1.38 + d * 0.08), 1.10, 1.80)
  const total = clamp(wave(t, 288, 200, 7200 + d * 1200), 4000, 11500)
  const it = total / pue
  const renewable = clamp(wave(t, 720, 20, CFG.renewableTarget - 5), 5, 95)
  const carbon = clamp(50 + 280 * (1 - renewable/100) + rand(-5,5), 40, 390)
  return {
    facility_id: facility,
    total_power_kw: +total.toFixed(1),
    it_power_kw: +it.toFixed(1),
    pue: +pue.toFixed(3),
    avg_temp_c: +(22 + d*4 + rand(-1,1)).toFixed(1),
    renewable_pct: +renewable.toFixed(1),
    carbon_gco2_kwh: +carbon.toFixed(0),
    ups_health_pct: +(91 + rand(-3,3)).toFixed(1),
    network_util_pct: +(35 + d*40 + rand(-5,5)).toFixed(1),
    cooling_eff_pct: +(88 + rand(-3,3)).toFixed(1),
    total_devices: DEVICES.length,
    online_devices: DEVICES.filter(d => d.status === 'online').length,
    capacity_util_pct: +(total / CFG.totalCapacityKw * 100).toFixed(1),
    cost_per_hour: +(total * CFG.tariffGbp).toFixed(2),
    cost_per_day: +(total * CFG.tariffGbp * 24).toFixed(0),
    gpu_burst: _gpuBurst,
    active_incident: _incidentActive,
    anomaly_rack: _anomalyRack,
    health_score: clamp(+(95 - (pue - 1.3)*20 - (renewable < 40 ? 5 : 0) + rand(-2,2)).toFixed(0), 0, 100),
  }
}

export function getLiveRacks() {
  return RACKS.map(r => {
    const isAnomaly = r.id === _anomalyRack
    const temp = clamp(noise(r.temp_c, 0.08) + (isAnomaly ? rand(6,15) : 0), 18, 55)
    const power = clamp(noise(r.power_used_kw, 0.06), 1, r.power_cap_kw * 1.05)
    const status = temp > CFG.tempCritical ? 'critical' : temp > CFG.tempWarning ? 'warning' : power / r.power_cap_kw > 0.95 ? 'warning' : 'normal'
    return { ...r, temp_c: +temp.toFixed(1), power_used_kw: +power.toFixed(2), status, anomaly: isAnomaly }
  })
}

// ── Power History ─────────────────────────────────────────────────────────────
export function getPowerHistory(hours = 24) {
  const pts = hours * 12
  return Array.from({ length: pts }, (_, i) => {
    const ts = subMinutes(new Date(), (pts - i) * 5)
    const h = ts.getHours(), d = diurnal(h)
    const total = clamp(wave(i, 72, 200, 7200 + d*1200), 4000, 11500)
    const pue = clamp(1.38 + d*0.08 + rand(-0.02, 0.02), 1.1, 1.8)
    const ren = clamp(CFG.renewableTarget - 5 + 18*Math.sin(2*Math.PI*i/144) + rand(-3,3), 5, 95)
    return {
      ts: ts.toISOString(), time: format(ts, 'HH:mm'),
      total, it: +(total/pue).toFixed(1), pue: +pue.toFixed(3),
      renewable: +ren.toFixed(1),
      carbon: +(50 + 280*(1-ren/100)).toFixed(0),
      cost: +(total * CFG.tariffGbp / 12).toFixed(2),
    }
  })
}

export function getRackTelemetry(rackId: string, hours = 24) {
  const pts = hours * 12
  const rack = RACKS.find(r => r.id === rackId)
  const isGpu = rack?.is_gpu
  return Array.from({ length: pts }, (_, i) => {
    const ts = subMinutes(new Date(), (pts - i) * 5)
    const d = diurnal(ts.getHours())
    return {
      ts: ts.toISOString(), time: format(ts, 'HH:mm'),
      temp: +(21 + d*7 + wave(i, 36, 2, 0)).toFixed(1),
      power_w: +(11000 + d*7000 + wave(i, 36, 1500, 0)).toFixed(0),
      cpu_pct: +(30 + d*45 + wave(i, 36, 12, 0)).toFixed(1),
      gpu_pct: isGpu ? +(45 + d*40 + wave(i, 36, 18, 0)).toFixed(1) : +(rand(0,5)).toFixed(1),
      humidity_pct: +(45 + rand(-5,5)).toFixed(1),
      airflow_cfm: +(1200 + d*400 + rand(-100,100)).toFixed(0),
    }
  })
}

// ── Alerts ────────────────────────────────────────────────────────────────────
const ALERT_TEMPLATES = [
  { sev: 'critical', msg: (r: string) => `Thermal anomaly on GPU node ${r} — inlet temp ${+(CFG.tempCritical+1.5).toFixed(1)}°C`, cause: 'CRAC efficiency degradation — refrigerant pressure drop suspected', action: 'Inspect CRAC-A2. Migrate workloads. Check coolant pressure.', system: 'cooling', mttr: 25 },
  { sev: 'critical', msg: (r: string) => `UPS ${r}: battery health critical — 72% capacity, runtime 4min`, cause: 'Battery cell degradation accelerated by recent load spikes', action: 'Transfer load to backup circuit. Schedule emergency battery replacement.', system: 'power', mttr: 45 },
  { sev: 'high', msg: (r: string) => `PSU-1 voltage instability on ${r} — anomalous power signature`, cause: 'PSU capacitor degradation — signature matches failure mode pattern #7', action: 'Enable PSU-2 standby. Order replacement. Schedule maintenance window.', system: 'power', mttr: 120 },
  { sev: 'high', msg: (r: string) => `Security: repeated auth failures on management console from ${r}`, cause: 'Possible brute-force attempt or misconfigured monitoring agent', action: 'Block source IP. Review auth logs. Notify security team.', system: 'security', mttr: 30 },
  { sev: 'high', msg: (r: string) => `GPU cluster ${r}: utilisation 99.4% — thermal throttling active`, cause: 'AI training workload burst exceeding thermal design envelope', action: 'Throttle GPU clocks 10%. Redistribute across Hall C liquid-cooled nodes.', system: 'compute', mttr: 15 },
  { sev: 'medium', msg: (r: string) => `Network uplink ${r}: 94% utilisation — congestion imminent`, cause: 'Concurrent AI training data ingestion exceeding link budget', action: 'Apply QoS policy. Stagger batch job schedules. Consider link aggregation.', system: 'network', mttr: 60 },
  { sev: 'medium', msg: (r: string) => `Predictive: cooling efficiency drop 8% detected at ${r}`, cause: 'CRAC filter maintenance overdue — airflow restriction building', action: 'Schedule CRAC inspection within 72h. Monitor inlet temps.', system: 'cooling', mttr: 180 },
  { sev: 'low', msg: (r: string) => `Fan bearing anomaly on server ${r} — RPM variance elevated`, cause: 'Fan bearing wear detected via acoustic signature analysis', action: 'Schedule physical inspection. Prepare replacement fan module.', system: 'compute', mttr: 480 },
]

let _alertCounter = 5000
export function generateAlerts(count = 15): any[] {
  return Array.from({ length: count }, (_, i) => {
    const tpl = ALERT_TEMPLATES[i % ALERT_TEMPLATES.length]
    const rack = RACKS[randInt(0, RACKS.length-1)]
    const src = `${rack.label}-${tpl.system}`
    return {
      id: `alert-${++_alertCounter}`, severity: tpl.sev,
      title: tpl.msg(rack.label), source: src, rack_label: rack.label,
      hall_id: rack.hall_id, system: tpl.system,
      probable_cause: tpl.cause, recommended_action: tpl.action,
      confidence_pct: +rand(65,97).toFixed(1),
      estimated_mttr_min: tpl.mttr,
      time_to_impact_min: tpl.sev === 'critical' ? randInt(5,30) : tpl.sev === 'high' ? randInt(20,90) : null,
      acknowledged: i > 10, dismissed: false,
      created_at: subMinutes(new Date(), randInt(1,120)).toISOString(),
      correlated_alerts: Math.random() > 0.6 ? randInt(2,8) : 0,
    }
  })
}

// ── Incidents ─────────────────────────────────────────────────────────────────
export const INCIDENTS: any[] = [
  {
    id: 'INC-2024-0847', title: 'Thermal Cascade — Hall A Zone 3',
    severity: 'critical', status: 'resolved', priority: 1,
    affected_systems: ['CRAC-A2','Rack A11','Rack A12','Rack A13','Rack A14'],
    blast_radius: { racks: 4, devices: 28, services: ['AI-Training-Pipeline-3','Analytics-Cluster'] },
    timeline: [
      { ts: subDays(new Date(),12).toISOString(), event: 'CRAC-A2 efficiency drop — 12% below baseline', actor: 'system', type: 'detection' },
      { ts: subDays(new Date(),12).toISOString(), event: 'Thermal alert cascade — racks A11-A14 entering warning zone', actor: 'system', type: 'escalation' },
      { ts: subDays(new Date(),11).toISOString(), event: 'NOC engineer dispatched — CRAC-A2 refrigerant low', actor: 'ops@dvt.io', type: 'response' },
      { ts: subDays(new Date(),11).toISOString(), event: 'Workloads migrated to Hall B — thermal relief achieved', actor: 'ops@dvt.io', type: 'mitigation' },
      { ts: subDays(new Date(),11).toISOString(), event: 'CRAC-A2 recharged — temps normalised in 40 minutes', actor: 'ops@dvt.io', type: 'resolution' },
    ],
    rca: '**Root Cause:** CRAC-A2 refrigerant leak causing progressive efficiency degradation over 72 hours.\n\n**Contributing Factors:**\n1. CRAC filter maintenance overdue by 18 days\n2. AI training workload burst (+34% power) at 14:20 UTC\n3. Hot-aisle containment seal failure on Rack A12\n\n**Resolution:** CRAC recharged, filters replaced, containment seal repaired.\n\n**Prevention:** Automated refrigerant pressure monitoring enabled. CRAC maintenance interval reduced to 30 days.',
    created_at: subDays(new Date(),12).toISOString(), resolved_at: subDays(new Date(),11).toISOString(),
    mttr_hours: 5.2, sla_breach: false,
  },
  {
    id: 'INC-2024-0851', title: 'UPS Battery Degradation — Hall C',
    severity: 'high', status: 'investigating', priority: 2,
    affected_systems: ['UPS-C2','Hall C (partial)'],
    blast_radius: { racks: 8, devices: 45, services: ['Storage-Cluster-2','Backup-Services'] },
    timeline: [
      { ts: subDays(new Date(),1).toISOString(), event: 'UPS-C2 battery health dropped below 85% threshold', actor: 'system', type: 'detection' },
      { ts: subDays(new Date(),1).toISOString(), event: 'Incident created — battery replacement planning required', actor: 'system', type: 'escalation' },
      { ts: subHours(new Date(),18).toISOString(), event: 'Maintenance team notified — parts ordered', actor: 'ops@dvt.io', type: 'response' },
    ],
    rca: null, created_at: subDays(new Date(),1).toISOString(), resolved_at: null,
    mttr_hours: null, sla_breach: false,
  },
  {
    id: 'INC-2024-0855', title: 'Network Fabric Congestion — Core Switch',
    severity: 'medium', status: 'resolved', priority: 3,
    affected_systems: ['Core-SW-B1','Hall B fabric'],
    blast_radius: { racks: 20, devices: 0, services: ['All Hall B services (latency impact)'] },
    timeline: [
      { ts: subDays(new Date(),3).toISOString(), event: 'Core-SW-B1 uplink saturation — 94% utilisation', actor: 'system', type: 'detection' },
      { ts: subDays(new Date(),3).toISOString(), event: 'QoS policy applied — AI training jobs staggered', actor: 'automation', type: 'mitigation' },
    ],
    rca: 'Concurrent AI training jobs caused burst traffic exceeding link budget. QoS policy applied automatically.',
    created_at: subDays(new Date(),3).toISOString(), resolved_at: subDays(new Date(),3).toISOString(),
    mttr_hours: 0.8, sla_breach: false,
  },
  {
    id: 'INC-2024-0859', title: 'Elevated PUE — Facility-Wide',
    severity: 'low', status: 'open', priority: 4,
    affected_systems: ['All halls'],
    blast_radius: { racks: 60, devices: 0, services: [] },
    timeline: [
      { ts: subHours(new Date(),6).toISOString(), event: 'PUE breached 1.58 — sustainability target missed', actor: 'system', type: 'detection' },
    ],
    rca: null, created_at: subHours(new Date(),6).toISOString(), resolved_at: null,
    mttr_hours: null, sla_breach: false,
  },
]

// ── Predictions ───────────────────────────────────────────────────────────────
export function getPredictions() {
  const types = [
    { type: 'psu_failure', label: 'PSU Failure', action: 'Schedule inspection. Check voltage rail stability. Prepare replacement unit.' },
    { type: 'cooling_degradation', label: 'Cooling Degradation', action: 'Inspect CRAC filters. Schedule engineer visit. Pre-cool adjacent zone.' },
    { type: 'rack_overload', label: 'Rack Power Overload', action: 'Review power allocation. Migrate low-priority workloads before threshold breach.' },
    { type: 'battery_deterioration', label: 'UPS Battery Failure', action: 'Plan battery replacement within next maintenance window. Test backup circuits.' },
    { type: 'network_congestion', label: 'Network Congestion', action: 'Apply traffic shaping. Review BGP policies. Consider link aggregation.' },
    { type: 'thermal_runaway', label: 'Thermal Runaway Risk', action: 'Reduce workload density. Check hot-aisle containment. Pre-stage portable cooling.' },
  ]
  return RACKS.slice(0, 24).map((rack, i) => {
    const t = types[i % types.length]
    const conf = +rand(48, 97).toFixed(1)
    const horizon = [30, 60, 360, 1440, 10080, 43200][i % 6]
    return {
      id: `pred-${i}`, rack_id: rack.id, rack_label: rack.label,
      hall_id: rack.hall_id, prediction_type: t.type, type_label: t.label,
      confidence_pct: conf,
      severity: conf > 85 ? 'critical' : conf > 70 ? 'high' : conf > 55 ? 'medium' : 'low',
      time_horizon_min: horizon,
      predicted_event_at: addMinutes(new Date(), horizon).toISOString(),
      recommended_action: t.action,
      model: ['LSTM-v3','Prophet-v2','IsolationForest','GradientBoost','Transformer-v1'][i%5],
      predicted_at: new Date().toISOString(),
    }
  }).sort((a,b) => b.confidence_pct - a.confidence_pct)
}

// ── Sustainability ────────────────────────────────────────────────────────────
export const SUSTAINABILITY_RECS = [
  { id:1, title:'Consolidate Hall A workloads to Hall B', category:'PUE', effort:'medium', priority:1,
    savings_kw:47, savings_gbp_yr:115248, carbon_kg_yr:72576,
    desc:'Migrating 8 underloaded racks reduces overhead by 12% and improves PUE by 0.09.' },
  { id:2, title:'Off-peak CRAC fan speed reduction (23:00–06:00)', category:'Cooling', effort:'low', priority:2,
    savings_kw:8.2, savings_gbp_yr:20117, carbon_kg_yr:10296,
    desc:'Predictive AI confirms safe 94% of off-peak nights. Zero downtime required.' },
  { id:3, title:'Schedule AI workloads during renewable peak windows', category:'Carbon', effort:'medium', priority:3,
    savings_kw:0, savings_gbp_yr:4200, carbon_kg_yr:21840,
    desc:'Solar 10:00–14:00, wind 00:00–04:00. Shifts 18% of training to renewables.' },
  { id:4, title:'Enable adaptive voltage scaling on 68 idle servers', category:'Server', effort:'low', priority:4,
    savings_kw:1.2, savings_gbp_yr:2938, carbon_kg_yr:1555,
    desc:'AVS at BIOS level reduces idle power by 18W/node. Zero downtime.' },
  { id:5, title:'Liquid cooling migration for Hall B GPU cluster', category:'Cooling', effort:'high', priority:5,
    savings_kw:65, savings_gbp_yr:159432, carbon_kg_yr:81900,
    desc:'Direct liquid cooling for DGX nodes achieves 94% efficiency vs 86% current air cooling.' },
]

// ── Automation Playbooks ──────────────────────────────────────────────────────
export const PLAYBOOKS = [
  { id:'pb-001', name:'Thermal Mitigation', trigger:'temp > threshold', category:'cooling', steps:['Identify affected racks','Reduce GPU clock speed 10%','Increase CRAC fan speed','Alert NOC','Migrate critical workloads'], runs: 47, success_rate: 96.8, avg_duration_min: 4.2, last_run: subHours(new Date(), 3).toISOString(), status:'active', requires_approval: false },
  { id:'pb-002', name:'UPS Failover', trigger:'ups_health < 80%', category:'power', steps:['Validate redundant circuit','Transfer load to backup UPS','Alert facilities team','Create maintenance ticket','Monitor for 30 minutes'], runs: 12, success_rate: 100, avg_duration_min: 2.1, last_run: subDays(new Date(), 6).toISOString(), status:'active', requires_approval: true },
  { id:'pb-003', name:'VM Live Migration', trigger:'host_util > 90%', category:'compute', steps:['Identify overloaded host','Select migration target','Validate target capacity','Execute vMotion','Verify service health'], runs: 234, success_rate: 98.3, avg_duration_min: 6.8, last_run: subHours(new Date(), 1).toISOString(), status:'active', requires_approval: false },
  { id:'pb-004', name:'Security Quarantine', trigger:'threat_score > 0.8', category:'security', steps:['Isolate affected host','Block network access','Capture forensic snapshot','Alert security team','Create incident'], runs: 8, success_rate: 100, avg_duration_min: 1.2, last_run: subDays(new Date(), 14).toISOString(), status:'active', requires_approval: true },
  { id:'pb-005', name:'Kubernetes Rebalancing', trigger:'pod_eviction_rate > 5%', category:'compute', steps:['Identify imbalanced nodes','Cordon overloaded node','Drain pods gracefully','Scale deployment','Uncordon node'], runs: 89, success_rate: 94.4, avg_duration_min: 8.5, last_run: subHours(new Date(), 5).toISOString(), status:'active', requires_approval: false },
  { id:'pb-006', name:'Network QoS Enforcement', trigger:'link_util > 90%', category:'network', steps:['Identify congested links','Apply traffic shaping','Stagger batch jobs','Alert ops team','Monitor for recovery'], runs: 156, success_rate: 99.4, avg_duration_min: 1.8, last_run: subHours(new Date(), 2).toISOString(), status:'active', requires_approval: false },
]

export const AUTOMATION_HISTORY: any[] = Array.from({ length: 30 }, (_, i) => ({
  id: uid(), playbook_id: PLAYBOOKS[i % PLAYBOOKS.length].id,
  playbook_name: PLAYBOOKS[i % PLAYBOOKS.length].name,
  triggered_at: subHours(new Date(), i * 3 + randInt(0,2)).toISOString(),
  completed_at: subHours(new Date(), i * 3 + randInt(0,1)).toISOString(),
  status: Math.random() > 0.05 ? 'success' : 'failed',
  trigger_value: +(rand(85,99)).toFixed(1),
  affected_resource: RACKS[randInt(0, RACKS.length-1)].label,
  approved_by: Math.random() > 0.7 ? 'admin@dvt.io' : null,
  duration_min: +rand(1,15).toFixed(1),
}))

// ── Security ──────────────────────────────────────────────────────────────────
export const SECURITY_EVENTS: any[] = Array.from({ length: 50 }, (_, i) => {
  const types = ['BRUTE_FORCE_ATTEMPT','PORT_SCAN','ANOMALOUS_ACCESS','PRIVILEGE_ESCALATION','LATERAL_MOVEMENT','CERT_EXPIRY_WARNING','CONFIG_CHANGE','LOGIN_SUCCESS','LOGIN_FAILED','API_ABUSE']
  const sevs = { BRUTE_FORCE_ATTEMPT:'high', PORT_SCAN:'medium', ANOMALOUS_ACCESS:'high', PRIVILEGE_ESCALATION:'critical', LATERAL_MOVEMENT:'critical', CERT_EXPIRY_WARNING:'medium', CONFIG_CHANGE:'low', LOGIN_SUCCESS:'info', LOGIN_FAILED:'low', API_ABUSE:'high' }
  const t = types[i % types.length]
  return {
    id: uid(), type: t, severity: (sevs as any)[t],
    source_ip: `${randInt(10,200)}.${randInt(0,255)}.${randInt(0,255)}.${randInt(1,254)}`,
    target: ['management-console','api-gateway','auth-service','monitoring-agent','ssh'][i%5],
    timestamp: subHours(new Date(), i * 0.5 + rand(0,0.4)).toISOString(),
    mitigated: Math.random() > 0.2,
    description: { BRUTE_FORCE_ATTEMPT:'Multiple failed login attempts detected', PORT_SCAN:'Systematic port scan from external IP', ANOMALOUS_ACCESS:'Unusual API access pattern outside business hours', PRIVILEGE_ESCALATION:'Attempt to escalate privileges on management host', LATERAL_MOVEMENT:'Suspicious internal traffic pattern', CERT_EXPIRY_WARNING:'TLS certificate expiring in 12 days', CONFIG_CHANGE:'Firewall rule modified', LOGIN_SUCCESS:'Successful authentication', LOGIN_FAILED:'Failed authentication attempt', API_ABUSE:'Excessive API request rate' }[t] ?? '',
  }
})

export const COMPLIANCE_CHECKS = [
  { framework:'ISO 27001', control:'Access Control (A.9)', status:'pass', last_checked: subHours(new Date(),2).toISOString(), evidence:'All accounts reviewed, MFA enforced for privileged users' },
  { framework:'SOC 2 Type II', control:'Encryption at Rest', status:'pass', last_checked: subHours(new Date(),2).toISOString(), evidence:'AES-256 verified on all storage systems' },
  { framework:'GDPR', control:'Data Retention Policy', status:'pass', last_checked: subHours(new Date(),2).toISOString(), evidence:'30-day telemetry purge policy active' },
  { framework:'PCI DSS', control:'Network Segmentation', status:'pass', last_checked: subHours(new Date(),2).toISOString(), evidence:'Management VLAN isolated, firewall rules verified' },
  { framework:'ISO 27001', control:'MFA Enforcement', status:'warn', last_checked: subHours(new Date(),2).toISOString(), evidence:'2 of 3 admin accounts have MFA. Remediation required.' },
  { framework:'SOC 2', control:'Certificate Management', status:'warn', last_checked: subHours(new Date(),2).toISOString(), evidence:'Management API cert expires in 12 days' },
  { framework:'NIST CSF', control:'Patch Management', status:'pass', last_checked: subHours(new Date(),2).toISOString(), evidence:'Critical patches applied within 48h SLA — 100% compliance' },
  { framework:'ISO 27001', control:'Intrusion Detection', status:'pass', last_checked: subHours(new Date(),2).toISOString(), evidence:'IDS active across all 3 halls and 60 network segments' },
]

// ── Capacity Planning ─────────────────────────────────────────────────────────
export function getCapacityForecast(months = 12) {
  return Array.from({ length: months }, (_, i) => {
    const growth = 1 + 0.035 * i + rand(-0.01, 0.01)
    const base_power = 8400
    const base_racks = 60
    return {
      month: format(addMinutes(new Date(), i * 30 * 24 * 60), 'MMM yy'),
      power_kw: +(base_power * growth).toFixed(0),
      rack_utilisation_pct: +Math.min(95, (base_racks * growth / 80 * 100)).toFixed(1),
      storage_tb: +(12000 * (1 + 0.05 * i)).toFixed(0),
      headroom_pct: +(100 - (base_power * growth / CFG.totalCapacityKw * 100)).toFixed(1),
      recommended_action: i >= 8 ? 'Provision expansion capacity' : i >= 5 ? 'Begin procurement planning' : null,
    }
  })
}

// ── AI Copilot Responses ──────────────────────────────────────────────────────
export function getAIResponse(message: string, contextData?: any): string {
  const m = message.toLowerCase()

  if (m.includes('rack') && (m.includes('overheat') || m.includes('hot') || m.includes('thermal') || m.includes('temperature'))) {
    const rack = RACKS.find(r => r.id === _anomalyRack) || RACKS[randInt(0,5)]
    return `## 🌡️ Thermal Analysis — Rack ${rack.label}\n\n**Current Status:** ${rack.is_gpu ? '⚠️ ELEVATED — GPU workload active' : '✅ Normal'}\n\n**Root Cause Analysis:**\nCorrelating telemetry across ${RACKS.length} racks and 3 CRAC units, I've identified the following causal chain:\n\n1. **CRAC-A2 efficiency**: 14% below baseline (refrigerant pressure 2.3 bar vs 3.1 bar nominal)\n2. **Workload density**: AI training burst at 14:20 UTC increased rack power draw by 34%\n3. **Hot-aisle containment**: Seal failure on Rack ${rack.label} detected — 12% bypass airflow\n\n**Predicted trajectory without intervention:**\n- T+8min: Temp exceeds ${CFG.tempCritical}°C → GPU thermal throttling\n- T+22min: Automated workload migration triggers\n- T+45min: CRAC-A2 compressor overload risk\n\n**Recommended Remediation Plan:**\n1. **Immediate (0-5min):** Reduce GPU clock speed by 10% on affected nodes\n2. **Short-term (5-30min):** Execute Playbook PB-001 (Thermal Mitigation)\n3. **Medium-term (1-4hr):** Schedule CRAC-A2 refrigerant recharge\n4. **Preventive:** Enable automated refrigerant pressure monitoring\n\n**Confidence:** 94.2% based on historical incident INC-2024-0847 correlation`
  }

  if (m.includes('outage') || m.includes('incident') || (m.includes('summar') && m.includes('current'))) {
    return `## 🚨 Active Incident Summary — INC-2024-0851\n\n**Status:** INVESTIGATING | **Severity:** HIGH | **Duration:** 18h 23m\n\n**Affected Systems:**\n- UPS-C2 battery health: 72% (threshold: 85%)\n- 8 racks at risk (A17-A20, C01-C04)\n- 45 devices potentially affected\n- Services at risk: Storage-Cluster-2, Backup-Services\n\n**Current Risk:**\n⚡ At current degradation rate, UPS-C2 will reach critical threshold (< 60%) in approximately **6-8 hours**. Transfer to utility power will last approximately **4 minutes** — below minimum for orderly shutdown of storage systems.\n\n**Blast Radius Analysis:**\nIf UPS-C2 fails without intervention:\n- **Primary impact:** 8 storage racks power loss\n- **Cascade risk:** Database writes in-flight — data corruption possible\n- **Recovery time:** Estimated 4-6 hours if storage systems require fsck\n\n**AI Recommendation:**\n1. Transfer load to UPS-C3 now (confirmed 40% spare capacity)\n2. Emergency battery replacement — ETA parts: 4 hours\n3. Gracefully migrate Storage-Cluster-2 write operations\n\n**Similar Historical Incidents:** INC-2023-0412 (MTTR: 3.2h), INC-2022-0891 (MTTR: 5.8h)`
  }

  if (m.includes('ups') || m.includes('power') || m.includes('battery')) {
    return `## ⚡ Power Infrastructure Analysis\n\n**UPS Fleet Status:**\n| Unit | Health | Runtime | Load | Status |\n|------|--------|---------|------|---------|\n| UPS-A1 | 94% | 18min | 67% | ✅ OK |\n| UPS-A2 | 91% | 16min | 71% | ✅ OK |\n| UPS-B1 | 88% | 14min | 78% | ⚠️ Monitor |\n| UPS-C1 | 85% | 12min | 82% | ⚠️ Monitor |\n| UPS-C2 | **72%** | **4min** | 84% | 🔴 Critical |\n\n**Predictive Analysis:**\nUPS-C2 battery degradation is accelerating. At current rate:\n- 60% health (critical): **~6 hours**\n- 50% health (failure risk): **~14 hours**\n\n**Power Chain Risk:**\nUPS-C2 → PDU-C-02/03 → 8 racks → 45 servers → Storage-Cluster-2\n\n**Total facility power:** ${(8400).toLocaleString()} kW | **Capacity:** ${CFG.totalCapacityKw.toLocaleString()} kW | **Headroom:** ${(((CFG.totalCapacityKw - 8400) / CFG.totalCapacityKw) * 100).toFixed(0)}%\n\n**Cost impact if UPS-C2 fails:** Est. £${(45 * 4 * 0.15).toFixed(0)}K recovery + potential SLA penalties`
  }

  if (m.includes('cool') || m.includes('crac') || m.includes('hvac')) {
    return `## ❄️ Cooling Systems Analysis\n\n**CRAC Unit Status:**\n| Unit | Hall | Efficiency | Inlet °C | Load | Status |\n|------|------|-----------|----------|------|---------|\n| CRAC-A1 | Hall A | 91.2% | 24.1°C | 72% | ✅ OK |\n| CRAC-A2 | Hall A | **74.8%** | **27.3°C** | 89% | 🔴 Degraded |\n| CRAC-B1 | Hall B | 89.4% | 24.8°C | 68% | ✅ OK |\n| CRAC-B2 | Hall B | 87.1% | 25.2°C | 74% | ⚠️ Monitor |\n| CRAC-C1 | Hall C | 94.8% | 23.1°C | 61% | ✅ Excellent |\n\n**Thermal Predictions (next 4 hours):**\n- Hall A: Rising if CRAC-A2 not repaired (predicted peak 29.8°C)\n- Hall B: Stable with current GPU workload\n- Hall C: Excellent — liquid cooling performing well\n\n**Efficiency Recommendation:**\nMigrating Hall A GPU workloads to Hall C liquid cooling would:\n- Reduce Hall A average temp by 3.2°C\n- Improve facility PUE from 1.38 → 1.31 (-5%)\n- Save £${(47 * CFG.tariffGbp * 8760).toLocaleString()} annually`
  }

  if (m.includes('risk') || m.includes('top') || m.includes('critical') || m.includes('danger')) {
    const preds = getPredictions().filter(p => p.severity === 'critical' || p.severity === 'high').slice(0,5)
    return `## 🎯 Critical Infrastructure Risk Assessment\n\n**Infrastructure Health Score: ${+(85 + rand(-5,5)).toFixed(0)}/100**\n\n**Top 5 Risks (AI-Ranked by Impact × Probability):**\n\n${preds.map((p,i) => `**${i+1}. ${p.rack_label}** — ${p.type_label}\n   Confidence: ${p.confidence_pct}% | Horizon: ${p.time_horizon_min < 60 ? p.time_horizon_min+'min' : Math.round(p.time_horizon_min/60)+'h'} | Model: ${p.model}\n   *${p.recommended_action}*`).join('\n\n')}\n\n**System-Level Risks:**\n- ⚡ UPS-C2 battery — replacement required within 6h\n- 🌡️ CRAC-A2 refrigerant — schedule recharge within 24h\n- 🔒 2 admin accounts without MFA — security gap\n- 📜 Management API cert expiry — 12 days remaining`
  }

  if (m.includes('pue') || m.includes('sustainab') || m.includes('carbon') || m.includes('energy') || m.includes('green')) {
    return `## 🌱 Sustainability & Efficiency Analysis\n\n**Current Performance:**\n- **PUE:** 1.382 ⚠️ (target: < ${CFG.pueTarget})\n- **Renewable energy:** 48.3% (target: ${CFG.renewableTarget}%)\n- **Carbon intensity:** 164 gCO₂/kWh\n- **WUE (Water Usage):** 1.52 L/kWh\n- **Annual energy cost:** £${(8400 * CFG.tariffGbp * 8760).toLocaleString()}\n\n**AI-Identified Savings Opportunities:**\n\n1. 🏗️ **Workload consolidation** → +£115K/yr, PUE -0.09\n2. ❄️ **CRAC off-peak optimization** → +£20K/yr, saves 8.2 kW\n3. ☀️ **Renewable scheduling** → -21,840 kg CO₂/yr\n4. 💻 **AVS on idle servers** → +£3K/yr, saves 1.2 kW\n5. 💧 **Liquid cooling migration** → +£159K/yr, PUE -0.12\n\n**Total addressable savings:** £${(115+20+3+159).toLocaleString()}K/yr | -96,000 kg CO₂/yr`
  }

  if (m.includes('automat') || m.includes('playbook') || m.includes('remediat')) {
    return `## 🤖 Automation Engine Status\n\n**Playbook Fleet:** ${PLAYBOOKS.length} active playbooks\n\n**Recent Executions (24h):**\n${PLAYBOOKS.slice(0,4).map(p => `- **${p.name}** — ${p.runs} total runs | ${p.success_rate}% success | Last: ${format(new Date(p.last_run),'HH:mm dd/MM')}`).join('\n')}\n\n**Recommended Automations to Execute Now:**\n\n1. **Thermal Mitigation (PB-001)** — Rack A12 temp rising\n   Status: Ready | Approval: Not required | ETA: 4.2 min\n\n2. **UPS Failover (PB-002)** — UPS-C2 health critical\n   Status: Ready | **Approval required** | ETA: 2.1 min\n\n**Human-in-the-Loop:** 2 playbooks require approval before execution. I can prepare the approval request — shall I proceed?`
  }

  if (m.includes('blast') || m.includes('affect') || m.includes('impact') || m.includes('depend')) {
    return `## 💥 Blast Radius Analysis — Current Risks\n\n**If UPS-C2 fails (Probability: 68% within 12h):**\n\`\`\`\nUPS-C2 → PDU-C-02 → Racks C01-C04\n              └──→ PDU-C-03 → Racks C05-C08\n                                    └──→ 45 servers\n                                    └──→ Storage-Cluster-2 (8PB data)\n                                    └──→ Backup-Services\n                                    └──→ Analytics-Pipeline-2\n\`\`\`\n**Recovery complexity:** HIGH — storage systems require ordered shutdown\n**Estimated impact:** £${(randInt(50,200))}K in recovery + potential SLA breach\n\n**If CRAC-A2 continues degrading:**\n- 4 racks enter thermal throttling → AI training 40% slower\n- Peak impact: £${(randInt(10,40))}K/day in delayed training jobs\n\n**Safe failover path available:** ✅ UPS-C3 has 40% spare capacity`
  }

  if (m.includes('ticket') || m.includes('mainten') || m.includes('create') || m.includes('work order')) {
    const id = `INC-2024-0${randInt(860,899)}`
    return `## ✅ Work Order Created — ${id}\n\n**Title:** Infrastructure Maintenance Task\n**Priority:** High\n**Assigned to:** NOC Operations Team\n**SLA:** 4-hour response, 8-hour resolution\n\n**Steps auto-generated:**\n1. Verify current system state against telemetry baseline\n2. Notify downstream service owners\n3. Execute maintenance with rollback checkpoint at each step\n4. Validate system health post-maintenance\n5. Update asset management record\n\n**Ticket ID:** \`${id}\`\nView and manage in the **Incidents** page. I've also notified the on-call engineer via email.\n\n_All actions are audit-logged per SOC 2 compliance requirements._`
  }

  if (m.includes('cost') || m.includes('spend') || m.includes('budget') || m.includes('price')) {
    const hourly = +(8400 * CFG.tariffGbp).toFixed(0)
    return `## 💰 Financial Analysis\n\n**Real-time Energy Spend:**\n| Period | Cost |\n|--------|------|\n| Per hour | £${hourly.toLocaleString()} |\n| Per day | £${(hourly*24).toLocaleString()} |\n| Per month | £${(hourly*24*30).toLocaleString()} |\n| Per year | £${(hourly*24*365).toLocaleString()} |\n\n**Cost by Hall:**\n- Hall A: £${(hourly*0.35).toFixed(0)}/hr (CRAC cooling overhead)\n- Hall B: £${(hourly*0.40).toFixed(0)}/hr (GPU-dense — highest density)\n- Hall C: £${(hourly*0.25).toFixed(0)}/hr (liquid cooled — most efficient)\n\n**5 AI-identified savings:** £${(297).toLocaleString()}K/year\n**ROI on liquid cooling migration:** 14 months payback\n\n**Carbon cost at current intensity:** £${(8400 * 164 / 1000 * 0.05 * 8760).toLocaleString()} equivalent/year`
  }

  return `## 🤖 DCIM AI Operations Assistant\n\nI'm your intelligent infrastructure operations partner. I have full visibility across **${RACKS.length} racks**, **${DEVICES.length} devices**, **${HALLS.length} halls**, and all facility systems.\n\n**I can help you with:**\n\n| Category | Example Query |\n|----------|---------------|\n| 🌡️ Thermal | "Why is Rack A12 overheating?" |\n| ⚡ Power | "Analyse UPS fleet health" |\n| 🚨 Incidents | "Summarise the current outage" |\n| 💥 Impact | "What systems does UPS-C2 affect?" |\n| 🎯 Risk | "Show all critical infrastructure risks" |\n| 🌱 Sustainability | "How do we improve our PUE?" |\n| 🤖 Automation | "What playbooks should I run now?" |\n| 💰 Cost | "What is our energy spend this month?" |\n| 🔒 Security | "Show recent threat activity" |\n| 📋 Maintenance | "Create a work order for rack A17" |\n\nTry any of the suggested queries or ask me anything about your infrastructure.`
}

// ── Report generation ─────────────────────────────────────────────────────────
export function generateReportData(type: string, start: Date, end: Date) {
  const history = getPowerHistory(Math.ceil((end.getTime() - start.getTime()) / 3600000))
  const avgPue = +(history.reduce((s,h) => s+h.pue, 0) / history.length).toFixed(3)
  const totalKwh = +(history.reduce((s,h) => s+h.total, 0) / 12).toFixed(0)
  const avgRen = +(history.reduce((s,h) => s+h.renewable, 0) / history.length).toFixed(1)
  return {
    type, period: { start: start.toISOString(), end: end.toISOString() },
    summary: { avg_pue: avgPue, total_kwh: totalKwh, avg_renewable_pct: avgRen, total_cost_gbp: +(totalKwh * CFG.tariffGbp).toFixed(0), incidents: INCIDENTS.filter(i => new Date(i.created_at) >= start).length, uptime_pct: 99.97 },
    records: history.slice(0, 48),
  }
}
