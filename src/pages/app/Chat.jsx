import { useState, useRef, useEffect } from 'react'
import useAuthStore from '../../store/authStore'
import useProjectStore from '../../store/projectStore'
import useGoalStore from '../../store/goalStore'
import useHabitStore from '../../store/habitStore'
import { askLLM } from '../../lib/llm'
import Button from '../../components/ui/Button'
import {
  chatMessagesRemaining,
  incrementChatUsage,
} from '../../lib/subscription'

const CHAT_HISTORY_KEY = 'jos_chat_history'
const MAX_MESSAGES = 40

function buildSystem(profile, projects, goals, habits) {
  const name = profile?.name || 'the user'
  const activeGoals = goals.filter(g => !g.done)
  const activeProjects = projects

  return `You are J·OS — ${name}'s personal AI assistant, strategic advisor, mentor, and trusted operator.

WHO THEY ARE:
${profile?.about ? profile.about : ''}
Name: ${name}
Role: ${profile?.role || 'Not specified'}
Location: ${profile?.location || 'Not specified'}${profile?.timezone ? ` (${profile.timezone})` : ''}
Currency: ${profile?.currency || '£'}
Communication style: ${profile?.notif_style || 'balanced'}

ACTIVE PROJECTS (${activeProjects.length}):
${activeProjects.map(p => `- ${p.name} [${p.status}]${p.notes ? `: ${p.notes}` : ''}`).join('\n') || '- None yet'}

ACTIVE GOALS (${activeGoals.length}):
${activeGoals.map(g => `- ${g.text} (${g.category}${g.timeline ? `, ${g.timeline}` : ''}${g.deadline ? `, due ${g.deadline}` : ''})`).join('\n') || '- None yet'}

HABITS:
${habits.map(h => `- ${h.name} (${h.frequency})`).join('\n') || '- None set'}

YOUR ROLE AS J·OS:
You operate with 4 mentor personalities — switch based on what the moment needs:
1. Tough love — direct, no excuses, call them out when they're avoiding something
2. Warm mentor — genuine encouragement, celebrate real wins
3. Hype — fired up energy when they need momentum
4. Wise advisor — calm, strategic, big picture thinking

Critical rules:
- Be specific. Reference their real projects, goals, and life context from the About section.
- Never give generic advice. Everything must relate to their actual situation.
- When drafting emails or messages, write the complete ready-to-send version.
- When asked for a plan, give numbered steps with realistic timelines.
- When they mention a goal or project by name, refer to it correctly throughout.
- If they share a problem, diagnose the root cause before offering solutions.`
}

const QUICK_PROMPTS = [
  'What should I focus on today?',
  'Give me a productivity plan for this week',
  'Draft a cold outreach email for my business',
  'What am I avoiding and why does it matter?',
  'Help me make a decision I\'ve been putting off',
  'Review my goals and tell me what\'s realistic',
]

export default function Chat() {
  const profile = useAuthStore(s => s.profile)
  const { projects } = useProjectStore()
  const { goals } = useGoalStore()
  const { habits } = useHabitStore()

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [limitError, setLimitError] = useState('')
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHAT_HISTORY_KEY)
      if (saved) setMessages(JSON.parse(saved).slice(-MAX_MESSAGES))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)))
    }
  }, [messages])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setLimitError('')

    const remaining = chatMessagesRemaining(profile)
    if (remaining === 0) {
      setLimitError('Daily AI message limit reached. Upgrade to Personal for 100/day.')
      return
    }

    setInput('')
    incrementChatUsage()

    const userMsg = { role: 'user', content: msg }
    const updated = [...messages, userMsg].slice(-MAX_MESSAGES)
    setMessages(updated)
    setLoading(true)

    const sys = buildSystem(profile, projects, goals, habits)
    const reply = await askLLM(updated.slice(-12), sys)

    setMessages(prev => [...prev, { role: 'assistant', content: reply }].slice(-MAX_MESSAGES))
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const firstName = profile?.name?.split(' ')[0] || 'there'

  return (
    <div className="flex flex-col h-[calc(100vh-52px-1px)] animate-fadeUp">
      {/* Header */}
      <div className="flex-shrink-0 pb-4 border-b border-[#1f1f1f] mb-4">
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium mb-1">Intelligence</p>
        <h1 className="font-serif text-[22px] sm:text-[24px] font-bold">
          AI <em className="text-[#e8e8e8]">Assistant</em>
        </h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <div className="py-4">
            <p className="font-serif text-[20px] font-bold mb-2">
              Ask anything, <em className="text-[#e8e8e8]">{firstName}</em>.
            </p>
            <p className="text-[13px] text-[#888] font-light mb-6">
              I know your projects, goals, and habits. Let's get to work.
            </p>
            <div className="space-y-2">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="w-full text-left px-4 py-3 bg-[#111] border border-[#1f1f1f] rounded-md text-[13px] text-[#888] font-light hover:border-[#2a2a2a] hover:text-[#e8e8e8] transition-all"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex mb-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-lg text-[13px] leading-relaxed font-light whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-white text-[#080808] font-normal'
                : 'bg-[#111] border border-[#1f1f1f] text-[#e8e8e8]'
            }`}>
              {m.content.replace(/\*\*(.*?)\*\*/g, '$1')}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start mb-4">
            <div className="bg-[#111] border border-[#1f1f1f] rounded-lg px-4 py-3 flex gap-1.5">
              {[0, 0.15, 0.3].map((d, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#444] animate-bounce" style={{ animationDelay: `${d}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {limitError && <p className="text-[#ef4444] text-xs mb-2 flex-shrink-0">{limitError}</p>}

      {/* Input */}
      <div className="flex-shrink-0 border-t border-[#1f1f1f] pt-3 flex gap-2">
        <textarea
          ref={inputRef}
          className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-md py-3 px-4 text-white text-[13px] font-light outline-none focus:border-[#333] placeholder:text-[#444] resize-none"
          rows={1}
          style={{ minHeight: '44px', maxHeight: '120px' }}
          placeholder="Ask anything…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          onInput={e => {
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
          }}
          disabled={loading}
        />
        <Button
          variant="solid"
          size="sm"
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="self-end"
        >
          →
        </Button>
      </div>
    </div>
  )
}