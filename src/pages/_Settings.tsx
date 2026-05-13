import { useState } from 'react'
import { Save, RefreshCw, Users, Database, Bell, Shield, Activity, Wifi, Key, Download } from 'lucide-react'
import { useAuthStore, useUsersStore, useConfigStore, type User } from '../store'
import { PageHeader, Btn, Modal, Tabs, Callout } from '../components/shared'
import { format } from 'date-fns'
import clsx from 'clsx'
import toast from 'react-hot-toast'

function _uid(){try{if(crypto?.randomUUID)return crypto.randomUUID()}catch{}return Math.random().toString(36).slice(2)+Date.now().toString(36)}

function SettingRow({label,desc,children}:{label:string;desc?:string;children:React.ReactNode}){
  return(
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex-1 mr-4"><div className="text-sm font-mono text-text-primary">{label}</div>{desc&&<div className="text-xs font-mono text-text-secondary mt-0.5">{desc}</div>}</div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function Toggle({v,onChange,disabled}:{v:boolean;onChange:(v:boolean)=>void;disabled?:boolean}){
  return(
    <button onClick={()=>!disabled&&onChange(!v)} disabled={disabled}
      className={clsx('w-11 h-6 rounded-full transition-all relative',v?'bg-accent':'bg-border',disabled&&'opacity-50 cursor-not-allowed')}>
      <div className={clsx('w-4 h-4 rounded-full bg-white absolute top-1 transition-all',v?'left-6':'left-1')}/>
    </button>
  )
}

const ROLE_STYLES:Record<string,string>={super_admin:'text-purple border-purple/30 bg-purple/10',admin:'text-accent border-accent/30 bg-accent/10',operator:'text-warning border-warning/30 bg-warning/10',viewer:'text-text-secondary border-border'}

export default function Settings() {
  const [tab,setTab]=useState('users')
  const {user:me,auditLog,addAudit}=useAuthStore()
  const {users,addUser,updateUser,deleteUser}=useUsersStore()
  const {cfg,update,reset}=useConfigStore()
  const isAdmin=me?.role==='super_admin'||me?.role==='admin'
  const [showAdd,setShowAdd]=useState(false)
  const [newUser,setNewUser]=useState({email:'',password:'',full_name:'',role:'viewer'})
  const [confirmReset,setConfirmReset]=useState(false)

  const audit=(action:string,detail:string)=>addAudit({user:me?.email??'system',action,resource:'settings',severity:'info',details:detail})

  const handleAdd=()=>{
    if(!newUser.email||!newUser.password)return toast.error('Email and password required')
    if(users.find(u=>u.email===newUser.email))return toast.error('Email already exists')
    const u:User={id:_uid(),email:newUser.email,full_name:newUser.full_name,role:newUser.role as any,is_active:true,created_at:new Date().toISOString().slice(0,10),mfa_enabled:false}
    addUser(u);audit('CREATE_USER',`${u.email} (${u.role})`)
    setShowAdd(false);setNewUser({email:'',password:'',full_name:'',role:'viewer'})
    toast.success(`User ${u.email} created`)
  }

  const exportAudit=()=>{
    const rows=auditLog.map(e=>`${e.ts},${e.user},${e.action},${e.resource},${e.severity},"${e.details||''}"`);const csv=['ts,user,action,resource,severity,details',...rows].join('\n')
    const a=document.createElement('a');a.href=`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;a.download=`audit-${new Date().toISOString().slice(0,10)}.csv`;a.click()
    toast.success('Audit log exported')
  }

  const TABS=[{id:'users',label:'Users',icon:<Users className="w-3.5 h-3.5"/>},{id:'platform',label:'Platform',icon:<Database className="w-3.5 h-3.5"/>},{id:'thresholds',label:'Thresholds',icon:<Bell className="w-3.5 h-3.5"/>},{id:'security',label:'Security',icon:<Shield className="w-3.5 h-3.5"/>},{id:'audit',label:'Audit Log',icon:<Key className="w-3.5 h-3.5"/>}]

  return (
    <div className="space-y-5">
      <PageHeader title="Platform Settings" sub="Full configuration — admin access required for write operations" crumbs={['DCIM','Settings']}
        actions={isAdmin&&<Btn variant="secondary" size="sm" onClick={()=>setConfirmReset(true)}><RefreshCw className="w-3.5 h-3.5"/>Reset Defaults</Btn>}/>

      {!isAdmin&&<Callout type="warning">Read-only view. Admin or Super Admin role required to modify settings.</Callout>}

      <Tabs tabs={TABS} active={tab} onChange={setTab}/>

      {tab==='users'&&(
        <div className="card space-y-4">
          <div className="flex items-center justify-between"><div className="section-title mb-0">User Management ({users.length})</div>
            {isAdmin&&<Btn variant="primary" size="sm" onClick={()=>setShowAdd(true)}>+ Add User</Btn>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead><tr className="text-text-secondary border-b border-border">{['Email','Name','Role','Status','MFA','Last Login'].map(h=><th key={h} className="text-left pb-2 pr-3">{h}</th>)}{isAdmin&&<th className="text-right pb-2">Actions</th>}</tr></thead>
              <tbody className="divide-y divide-border">
                {users.map(u=>(
                  <tr key={u.id} className="hover:bg-surface/50">
                    <td className="py-2 pr-3 font-bold text-text-primary">{u.email}</td>
                    <td className="py-2 pr-3 text-text-secondary">{u.full_name||'—'}</td>
                    <td className="py-2 pr-3"><span className={clsx('border rounded px-1.5 py-0.5 text-[10px] font-mono uppercase',ROLE_STYLES[u.role])}>{u.role.replace('_',' ')}</span></td>
                    <td className="py-2 pr-3"><span className={clsx('font-bold',u.is_active?'text-success':'text-critical')}>{u.is_active?'ACTIVE':'INACTIVE'}</span></td>
                    <td className="py-2 pr-3"><span className={clsx('text-[10px]',u.mfa_enabled?'text-success':'text-text-secondary/40')}>{u.mfa_enabled?'✓ On':'✗ Off'}</span></td>
                    <td className="py-2 pr-3 text-text-secondary">{u.last_login?format(new Date(u.last_login),'MMM d HH:mm'):'Never'}</td>
                    {isAdmin&&<td className="py-2 text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={()=>{updateUser(u.id,{mfa_enabled:!u.mfa_enabled});audit('TOGGLE_MFA',u.email);toast.success('MFA updated')}} className="text-[10px] font-mono border border-border rounded px-1.5 py-0.5 hover:border-accent/30 transition-colors">{u.mfa_enabled?'Disable':'Enable'} MFA</button>
                        <button onClick={()=>{updateUser(u.id,{is_active:!u.is_active});audit(u.is_active?'DEACTIVATE':'ACTIVATE','user:'+u.email);toast.success(u.is_active?'Deactivated':'Activated')}} className="text-[10px] font-mono border border-border rounded px-1.5 py-0.5 hover:border-warning/30 transition-colors">{u.is_active?'Deactivate':'Activate'}</button>
                        {u.email!==me?.email&&<button onClick={()=>{deleteUser(u.id);audit('DELETE_USER',u.email);toast.success('Deleted')}} className="text-[10px] font-mono border border-critical/30 text-critical rounded px-1.5 py-0.5 hover:bg-critical/10 transition-colors">Delete</button>}
                      </div>
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==='platform'&&(
        <div className="card">
          <div className="section-title">Data Centre Configuration</div>
          <SettingRow label="Facility Name"><input value={cfg.dcName} onChange={e=>update({dcName:e.target.value})} disabled={!isAdmin} className="input w-64"/></SettingRow>
          <SettingRow label="Location"><input value={cfg.dcLocation} onChange={e=>update({dcLocation:e.target.value})} disabled={!isAdmin} className="input w-64"/></SettingRow>
          <SettingRow label="Organisation"><input value={cfg.orgName} onChange={e=>update({orgName:e.target.value})} disabled={!isAdmin} className="input w-64"/></SettingRow>
          <SettingRow label="Tier Level"><select value={cfg.dcTier} onChange={e=>update({dcTier:+e.target.value})} disabled={!isAdmin} className="input w-24">{[1,2,3,4].map(t=><option key={t} value={t}>Tier {t}</option>)}</select></SettingRow>
          <SettingRow label="Total Capacity"><div className="flex items-center gap-2"><input type="number" value={cfg.totalCapacityKw} onChange={e=>update({totalCapacityKw:+e.target.value})} disabled={!isAdmin} className="input w-28 text-right"/><span className="text-xs font-mono text-text-secondary">kW</span></div></SettingRow>
          <SettingRow label="Energy Tariff"><div className="flex items-center gap-2"><input type="number" step="0.01" value={cfg.tariffGbp} onChange={e=>update({tariffGbp:+e.target.value})} disabled={!isAdmin} className="input w-20 text-right"/><span className="text-xs font-mono text-text-secondary">£/kWh</span></div></SettingRow>
          <SettingRow label="Currency"><select value={cfg.currency} onChange={e=>update({currency:e.target.value})} disabled={!isAdmin} className="input w-24">{['GBP','USD','EUR','SGD'].map(c=><option key={c}>{c}</option>)}</select></SettingRow>
          <SettingRow label="PUE Target"><input type="number" step="0.01" value={cfg.pueTarget} onChange={e=>update({pueTarget:+e.target.value})} disabled={!isAdmin} className="input w-20 text-right"/></SettingRow>
          <SettingRow label="Renewable Target"><div className="flex items-center gap-2"><input type="number" value={cfg.renewableTarget} onChange={e=>update({renewableTarget:+e.target.value})} disabled={!isAdmin} className="input w-20 text-right"/><span className="text-xs font-mono text-text-secondary">%</span></div></SettingRow>
          {isAdmin&&<div className="pt-3 flex justify-end"><Btn variant="primary" size="sm" onClick={()=>{audit('UPDATE_CONFIG','Platform settings');toast.success('Settings saved')}}><Save className="w-3.5 h-3.5"/>Save Changes</Btn></div>}
        </div>
      )}

      {tab==='thresholds'&&(
        <div className="card">
          <div className="section-title">Alert Thresholds — Changes take effect immediately</div>
          <SettingRow label="Temperature Warning" desc="Triggers medium alert"><div className="flex gap-2"><input type="number" value={cfg.tempWarning} onChange={e=>update({tempWarning:+e.target.value})} disabled={!isAdmin} className="input w-20 text-right"/><span className="text-xs font-mono text-text-secondary">°C</span></div></SettingRow>
          <SettingRow label="Temperature Critical" desc="Triggers critical alert + banner"><div className="flex gap-2"><input type="number" value={cfg.tempCritical} onChange={e=>update({tempCritical:+e.target.value})} disabled={!isAdmin} className="input w-20 text-right"/><span className="text-xs font-mono text-text-secondary">°C</span></div></SettingRow>
          <SettingRow label="PUE Warning"><input type="number" step="0.01" value={cfg.pueWarning} onChange={e=>update({pueWarning:+e.target.value})} disabled={!isAdmin} className="input w-20 text-right"/></SettingRow>
          <SettingRow label="PUE Critical"><input type="number" step="0.01" value={cfg.pueCritical} onChange={e=>update({pueCritical:+e.target.value})} disabled={!isAdmin} className="input w-20 text-right"/></SettingRow>
          {isAdmin&&<div className="pt-3 flex justify-end"><Btn variant="primary" size="sm" onClick={()=>{audit('UPDATE_THRESHOLDS','Alert thresholds');toast.success('Thresholds saved')}}><Save className="w-3.5 h-3.5"/>Save Thresholds</Btn></div>}
        </div>
      )}

      {tab==='security'&&(
        <div className="card">
          <div className="section-title">Security Configuration</div>
          <SettingRow label="Refresh Interval" desc="Platform data refresh rate"><div className="flex gap-2"><input type="number" value={cfg.refreshIntervalSec} onChange={e=>update({refreshIntervalSec:+e.target.value})} disabled={!isAdmin} className="input w-20 text-right"/><span className="text-xs font-mono text-text-secondary">sec</span></div></SettingRow>
          <Callout type="info" >Security features including SSO, OAuth2/JWT, MFA enforcement, IP restrictions, SIEM integration, and immutable audit logs are available in the Enterprise tier. Contact your administrator to enable.</Callout>
        </div>
      )}

      {tab==='audit'&&(
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="section-title mb-0">Audit Log ({auditLog.length} entries)</div>
            <Btn variant="secondary" size="sm" onClick={exportAudit}><Download className="w-3.5 h-3.5"/>Export CSV</Btn>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead><tr className="text-text-secondary border-b border-border">{['Time','User','Action','Resource','Details'].map(h=><th key={h} className="text-left pb-2 pr-3">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-border">
                {auditLog.slice(0,50).map(e=>(
                  <tr key={e.id} className="hover:bg-surface/50">
                    <td className="py-1.5 pr-3 text-text-secondary whitespace-nowrap">{format(new Date(e.ts),'MMM d HH:mm:ss')}</td>
                    <td className="py-1.5 pr-3 text-text-primary">{e.user}</td>
                    <td className="py-1.5 pr-3"><span className={clsx('font-bold',e.action.includes('DELETE')?'text-critical':e.action.includes('CREATE')?'text-success':'text-accent')}>{e.action}</span></td>
                    <td className="py-1.5 pr-3 text-text-secondary">{e.resource}</td>
                    <td className="py-1.5 text-text-secondary/70 truncate max-w-xs">{e.details}</td>
                  </tr>
                ))}
                {auditLog.length===0&&<tr><td colSpan={5} className="py-6 text-center text-text-secondary">No audit entries yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Add New User">
        <div className="space-y-4">
          {[{k:'email',l:'Email',t:'email',ph:'user@example.com'},{k:'full_name',l:'Full Name',t:'text',ph:'Jane Smith'},{k:'password',l:'Password',t:'password',ph:'8+ characters'}].map(({k,l,t,ph})=>(
            <div key={k}><label className="text-xs font-mono text-text-secondary block mb-1">{l}</label><input type={t} placeholder={ph} value={(newUser as any)[k]} onChange={e=>setNewUser(p=>({...p,[k]:e.target.value}))} className="input w-full"/></div>
          ))}
          <div><label className="text-xs font-mono text-text-secondary block mb-1">Role</label>
            <select value={newUser.role} onChange={e=>setNewUser(p=>({...p,role:e.target.value}))} className="input w-full">
              <option value="viewer">Viewer — read-only access</option>
              <option value="operator">Operator — full operations access</option>
              <option value="admin">Admin — full access + settings</option>
              <option value="super_admin">Super Admin — unrestricted access</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end"><Btn variant="secondary" onClick={()=>setShowAdd(false)}>Cancel</Btn><Btn variant="primary" onClick={handleAdd}>Create User</Btn></div>
        </div>
      </Modal>

      <Modal open={confirmReset} onClose={()=>setConfirmReset(false)} title="Reset All Settings">
        <div className="space-y-4">
          <Callout type="critical">This resets ALL platform settings to factory defaults. User accounts will not be affected. This cannot be undone.</Callout>
          <div className="flex gap-2 justify-end"><Btn variant="secondary" onClick={()=>setConfirmReset(false)}>Cancel</Btn><Btn variant="danger" onClick={()=>{reset();audit('RESET_ALL','Factory defaults restored');setConfirmReset(false);toast.success('Reset complete')}}>Reset to Defaults</Btn></div>
        </div>
      </Modal>
    </div>
  )
}
