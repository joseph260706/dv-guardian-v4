import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Cpu, Zap, Thermometer, Shield, BarChart2, Leaf, RefreshCw, Copy, Check, ChevronRight } from 'lucide-react'
import { useAIStore, useKPIStore, useAlertStore } from '../store'
import { getAIResponse, getLiveKPIs, generateAlerts, INCIDENTS, PLAYBOOKS, FACILITIES } from '../data/engine'
import { PageHeader } from '../components/shared'
import { formatDistanceToNow } from 'date-fns'

const SUGGESTIONS = [
  { icon: Thermometer, text: 'Why is Rack A12 overheating?', cat: 'Thermal' },
  { icon: Zap, text: 'Analyse UPS fleet health and risks', cat: 'Power' },
  { icon: Shield, text: 'Show all critical infrastructure risks', cat: 'Risk' },
  { icon: Bot, text: 'Summarise the current active incident', cat: 'Incident' },
  { icon: Leaf, text: 'How can we improve our PUE to target?', cat: 'Sustainability' },
  { icon: RefreshCw, text: 'What automation playbooks should I run now?', cat: 'Automation' },
  { icon: BarChart2, text: 'Show current energy spend and forecast', cat: 'Cost' },
  { icon: Cpu, text: 'Predict cooling capacity exhaustion timeline', cat: 'Capacity' },
]

function Markdown({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-1.5 text-sm">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <h2 key={i} className="text-base font-bold text-white mt-3 mb-1">{line.slice(3)}</h2>
        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold text-white">{line.slice(2,-2)}</p>
        if (line.startsWith('- ')) return <li key={i} className="text-slate-300 ml-3">{line.slice(2).replace(/\*\*(.*?)\*\*/g, '$1')}</li>
        if (/^\d+\./.test(line)) return <li key={i} className="text-slate-300 ml-3 list-decimal">{line.replace(/^\d+\.\s*/,'').replace(/\*\*(.*?)\*\*/g,'$1')}</li>
        if (line.startsWith('|')) {
          const cells = line.split('|').filter(Boolean).map(c => c.trim())
          if (cells.every(c => /^[-:]+$/.test(c))) return null
          return <div key={i} className="flex gap-2 text-xs font-mono border-b border-slate-800/50 py-1">
            {cells.map((c,j) => <span key={j} className={`flex-1 ${j===0?'text-slate-300':'text-slate-400'} ${c.includes('✅')||c.includes('OK')?'text-green-400':c.includes('🔴')||c.includes('Critical')?'text-red-400':c.includes('⚠')?'text-yellow-400':''}`}>{c}</span>)}
          </div>
        }
        if (line.startsWith('```')) return null
        if (line.trim() === '') return <div key={i} className="h-1" />
        return <p key={i} className="text-slate-300 leading-relaxed">{line.replace(/\*\*(.*?)\*\*/g, (_, m) => m)}</p>
      })}
    </div>
  )
}

function ContextPanel() {
  const kpis = useKPIStore(s => s.kpis)
  const alerts = useAlertStore(s => s.alerts)
  const critical = alerts.filter(a => a.severity === 'critical' && !a.dismissed).length
  const activeInc = INCIDENTS.filter(i => i.status !== 'resolved')
  return (
    <div className="w-72 shrink-0 space-y-4 hidden xl:block">
      <div className="card">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Infrastructure Context</h3>
        <div className="space-y-2.5">
          {[
            { label: 'Facilities', value: `${FACILITIES.length} online` },
            { label: 'Power (kW)', value: kpis?.total_power_kw?.toLocaleString() ?? '—' },
            { label: 'PUE', value: kpis?.pue ?? '—' },
            { label: 'Health Score', value: `${kpis?.health_score ?? '—'}/100` },
            { label: 'Active Alerts', value: `${critical} critical` },
            { label: 'Open Incidents', value: activeInc.length },
            { label: 'Renewable', value: `${kpis?.renewable_pct ?? '—'}%` },
          ].map(r => (
            <div key={r.label} className="flex justify-between items-center">
              <span className="text-xs text-slate-500">{r.label}</span>
              <span className="text-xs font-mono text-white">{r.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Active Playbooks</h3>
        <div className="space-y-2">
          {PLAYBOOKS.slice(0, 4).map(p => (
            <div key={p.id} className="flex justify-between items-center text-xs">
              <span className="text-slate-300 truncate">{p.name}</span>
              <span className="text-green-400 font-mono shrink-0 ml-2">{p.success_rate}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">AI Model Stack</h3>
        <div className="space-y-1.5">
          {['LSTM-v3 · Thermal','Prophet-v2 · Power','IsolationForest · Anomaly','GradientBoost · Failure','Transformer-v1 · NLP'].map(m => (
            <div key={m} className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {m}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AIAssistant() {
  const { messages, addMessage, clearMessages } = useAIStore()
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || thinking) return
    setInput('')
    addMessage({ id: Date.now().toString(), role: 'user', content: msg, ts: new Date().toISOString() })
    setThinking(true)
    await new Promise(r => setTimeout(r, 900 + Math.random() * 800))
    const response = getAIResponse(msg, { kpis: getLiveKPIs(), alerts: generateAlerts(5) })
    addMessage({ id: (Date.now()+1).toString(), role: 'assistant', content: response, ts: new Date().toISOString() })
    setThinking(false)
  }

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div>
      <PageHeader title="AI Operations Assistant" subtitle="Autonomous infrastructure intelligence · Incident analysis · Predictive insights"
        icon={<Bot className="w-5 h-5 text-cyan-400" />}
        actions={messages.length > 0 ? <button onClick={clearMessages} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Clear conversation</button> : undefined} />

      <div className="flex gap-5 h-[calc(100vh-200px)]">
        <ContextPanel />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 mb-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                    <Bot className="w-8 h-8 text-cyan-400" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 border-2 border-slate-900 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">DCIM AI Operations Assistant</h2>
                  <p className="text-sm text-slate-400 max-w-md">I have full visibility across your infrastructure — racks, devices, power, cooling, security, and incidents. Ask me anything.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full max-w-xl">
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => send(s.text)} className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 hover:border-cyan-700/50 text-left transition-all group">
                      <s.icon className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <div className="text-xs text-slate-400 mb-0.5">{s.cat}</div>
                        <div className="text-xs text-slate-300 group-hover:text-white transition-colors">{s.text}</div>
                      </div>
                      <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 ml-auto shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === 'assistant' ? 'bg-cyan-900/40 border border-cyan-700/40' : 'bg-slate-700 border border-slate-600'}`}>
                      {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-cyan-400" /> : <span className="text-xs font-bold text-slate-300">You</span>}
                    </div>
                    <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      {msg.role === 'user' ? (
                        <div className="bg-cyan-900/30 border border-cyan-700/30 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-white">{msg.content}</div>
                      ) : (
                        <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl rounded-tl-sm px-4 py-3 group relative">
                          <Markdown text={msg.content} />
                          <button onClick={() => copy(msg.content, msg.id)} className="absolute top-2 right-2 p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-700 transition-all text-slate-500 hover:text-slate-300">
                            {copied === msg.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                      <span className="text-xs text-slate-600 px-1">{formatDistanceToNow(new Date(msg.ts), {addSuffix:true})}</span>
                    </div>
                  </div>
                ))}
                {thinking && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-900/40 border border-cyan-700/40 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex gap-1.5 items-center">
                        <div className="flex gap-1">
                          {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{animationDelay:`${i*150}ms`}} />)}
                        </div>
                        <span className="text-xs text-slate-500 ml-1">Analysing infrastructure…</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Ask about your infrastructure… (Enter to send, Shift+Enter for newline)"
              rows={3}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 pr-14 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/30"
            />
            <button onClick={() => send()} disabled={!input.trim() || thinking}
              className="absolute right-3 bottom-3 w-8 h-8 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white flex items-center justify-center transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-600 text-center mt-2">AI responses are generated from live telemetry and historical incident data.</p>
        </div>
      </div>
    </div>
  )
}
