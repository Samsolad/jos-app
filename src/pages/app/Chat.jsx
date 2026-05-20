import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import useProjectStore from '../../store/projectStore'
import useGoalStore from '../../store/goalStore'
import useHabitStore from '../../store/habitStore'
import { askLLM } from '../../lib/llm'
import {
  chatMessagesRemaining,
  incrementChatUsage,
} from '../../lib/subscription'
import { buildMemoryContext } from '../../lib/memory'
import { trackEvent, EVENT_TYPES } from '../../lib/behaviour'
import GradientOrb from '../../components/ai/GradientOrb'
import MessageBubble from '../../components/ai/MessageBubble'
import TypingIndicator from '../../components/ai/TypingIndicator'
import ThinkingIndicator from '../../components/ai/ThinkingIndicator'
import ConversationSidebar from '../../components/ai/ConversationSidebar'
import ChatInputBar from '../../components/ai/ChatInputBar'
import ThemeToggle from '../../components/ui/ThemeToggle'

const CHAT_HISTORY_KEY = 'jos_chat_history'
const PERSONALITY_KEY = 'jos_ai_personality'
const MAX_MESSAGES = 40

const QUICK_PROMPTS = [
  'What should I focus on today?',
  'Give me a productivity plan for this week',
  'Draft a cold outreach email for my business',
  'What am I avoiding and why does it matter?',
  'Help me make a decision I\'ve been putting off',
  'Review my goals and tell me what\'s realistic',
]

const PERSONALITY_PROMPTS = {
  professional: 'Respond in a clear, professional tone. Be structured and direct.',
  friendly: 'Respond warmly and conversationally, like a trusted friend who happens to be sharp.',
  concise: 'Be brief. Use bullets. No fluff. Maximum clarity in minimum words.',
}

function buildSystem(profile, projects, goals, habits, personality) {
  const name = profile?.name || 'the user'
  const activeGoals = goals.filter((g) => !g.done)
  const activeProjects = projects

  return `You are J·OS — ${name}'s personal AI assistant, strategic advisor, mentor, and trusted operator.

TONE: ${PERSONALITY_PROMPTS[personality] || PERSONALITY_PROMPTS.friendly}

WHO THEY ARE:
${profile?.about ? profile.about : ''}
Name: ${name}
Role: ${profile?.role || 'Not specified'}
Location: ${profile?.location || 'Not specified'}${profile?.timezone ? ` (${profile.timezone})` : ''}
Currency: ${profile?.currency || '£'}
Communication style: ${profile?.notif_style || 'balanced'}

ACTIVE PROJECTS (${activeProjects.length}):
${activeProjects.map((p) => `- ${p.name} [${p.status}]${p.notes ? `: ${p.notes}` : ''}`).join('\n') || '- None yet'}

ACTIVE GOALS (${activeGoals.length}):
${activeGoals.map((g) => `- ${g.text} (${g.category}${g.timeline ? `, ${g.timeline}` : ''}${g.deadline ? `, due ${g.deadline}` : ''})`).join('\n') || '- None yet'}

HABITS:
${habits.map((h) => `- ${h.name} (${h.frequency})`).join('\n') || '- None set'}

YOUR ROLE AS J·OS:
You operate with 4 mentor personalities — switch based on what the moment needs:
1. Tough love — direct, no excuses
2. Warm mentor — genuine encouragement
3. Hype — fired up energy
4. Wise advisor — calm, strategic

Critical rules:
- Be specific. Reference their real projects, goals, and life context.
- Never give generic advice.
- When drafting emails, write the complete ready-to-send version.
- When asked for a plan, give numbered steps with realistic timelines.`
}

function MessageActions({ content, onRegenerate }) {
  const copy = () => navigator.clipboard?.writeText(content)

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="text-[11px] text-jos-muted hover:text-jos-accent px-2 py-1 rounded border border-transparent hover:border-jos-border transition-colors"
      >
        Copy
      </button>
      {onRegenerate && (
        <button
          type="button"
          onClick={onRegenerate}
          className="text-[11px] text-jos-muted hover:text-jos-violet px-2 py-1 rounded border border-transparent hover:border-jos-border transition-colors"
        >
          Regenerate
        </button>
      )}
    </>
  )
}

export default function Chat() {
  const profile = useAuthStore((s) => s.profile)
  const { projects } = useProjectStore()
  const { goals } = useGoalStore()
  const { habits } = useHabitStore()

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [limitError, setLimitError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [thinkingStep, setThinkingStep] = useState(0)
  const [showReasoning, setShowReasoning] = useState(false)
  const [personality, setPersonality] = useState('friendly')
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)
  const endRef = useRef(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHAT_HISTORY_KEY)
      if (saved) setMessages(JSON.parse(saved).slice(-MAX_MESSAGES))
      const p = localStorage.getItem(PERSONALITY_KEY)
      if (p) setPersonality(p)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)))
    }
  }, [messages])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, showReasoning])

  useEffect(() => {
    if (!loading) {
      setThinkingStep(0)
      return
    }
    setShowReasoning(true)
    const t1 = setTimeout(() => setThinkingStep(1), 400)
    const t2 = setTimeout(() => setThinkingStep(2), 900)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [loading])

  const handlePersonalityChange = (p) => {
    setPersonality(p)
    try {
      localStorage.setItem(PERSONALITY_KEY, p)
    } catch { /* ignore */ }
  }

  const aiState = loading ? 'thinking' : listening ? 'listening' : 'idle'
  const firstName = profile?.name?.split(' ')[0] || 'there'

  const send = useCallback(async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setLimitError('')

    const remaining = chatMessagesRemaining(profile)
    if (remaining === 0) {
      setLimitError('Daily AI message limit reached. Upgrade to Personal for more messages.')
      return
    }

    setInput('')
    incrementChatUsage()
    trackEvent(EVENT_TYPES.CHAT_SENT, { length: msg.length })

    const userMsg = { role: 'user', content: msg }
    const updated = [...messages, userMsg].slice(-MAX_MESSAGES)
    setMessages(updated)
    setLoading(true)

    try {
      const memoryCtx = await buildMemoryContext(msg)
      const sys = buildSystem(profile, projects, goals, habits, personality) + memoryCtx
      const reply = await askLLM(updated.slice(-12), sys)
      setMessages((prev) =>
        [...prev, { role: 'assistant', content: reply, confidence: 0.85 }].slice(-MAX_MESSAGES),
      )
    } catch (err) {
      setMessages((prev) =>
        [
          ...prev,
          {
            role: 'assistant',
            content: `Something went wrong: ${err?.message || 'Please try again.'}`,
            confidence: 0.3,
          },
        ].slice(-MAX_MESSAGES),
      )
    } finally {
      setLoading(false)
      setShowReasoning(false)
    }
  }, [input, loading, messages, profile, projects, goals, habits, personality])

  const clearChat = () => {
    setMessages([])
    localStorage.removeItem(CHAT_HISTORY_KEY)
  }

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setLimitError('Voice input is not supported in this browser.')
      return
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
      setListening(false)
      return
    }
    const rec = new SpeechRecognition()
    rec.continuous = false
    rec.interimResults = false
    rec.onstart = () => setListening(true)
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    rec.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript
      if (transcript) setInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
    }
    recognitionRef.current = rec
    rec.start()
  }

  return (
    <div className="flex h-[100dvh] md:h-full bg-jos-bg">
      {/* Main conversation column */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Minimal top bar */}
        <div
          className="app-header flex-shrink-0 flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-jos-border bg-jos-bg/90 backdrop-blur-md"
          style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <GradientOrb state={aiState} size="sm" className="sm:hidden flex-shrink-0" />
            <GradientOrb state={aiState} size="md" className="hidden sm:flex flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="font-display text-[15px] sm:text-[18px] font-semibold text-jos-text truncate">
                J·OS <span className="jos-gradient-text">AI</span>
              </h1>
              <p className="hidden sm:block text-[11px] text-jos-muted truncate">
                {loading ? 'Thinking…' : `Here for you, ${firstName}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-2 flex-shrink-0">
            <Link
              to="/"
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-jos-muted hover:text-jos-text hover:bg-jos-surface-2"
              aria-label="Back to Command Hub"
            >
              ←
            </Link>
            <ThemeToggle />
            <button
              type="button"
              onClick={clearChat}
              className="hidden sm:block text-[11px] text-jos-muted hover:text-jos-text px-2 py-1"
            >
              New chat
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg border border-jos-border text-jos-muted hover:text-jos-text"
              aria-label="Open context sidebar"
            >
              <span className="text-base" aria-hidden>☰</span>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-4 py-4"
          role="log"
          aria-live="polite"
          aria-label="Conversation"
        >
          <div className="max-w-3xl mx-auto">
            {messages.length === 0 && (
              <div className="py-8 text-center sm:text-left animate-fadeUp">
                <GradientOrb state="idle" size="lg" className="mx-auto sm:mx-0 mb-4" />
                <p className="font-accent text-[22px] font-semibold text-jos-text mb-2">
                  Ask anything, <span className="jos-gradient-text">{firstName}</span>
                </p>
                <p className="text-[14px] text-jos-muted mb-6 max-w-md">
                  I know your projects, goals, and habits. Transparent reasoning, memory-aware answers.
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <MessageBubble
                key={i}
                role={m.role}
                content={m.content}
                confidence={m.role === 'assistant' ? m.confidence : undefined}
                showOrb={i === messages.length - 1 || m.role === 'assistant'}
                actions={
                  m.role === 'assistant' ? (
                    <MessageActions
                      content={m.content}
                      onRegenerate={
                        i === messages.length - 1 && !loading
                          ? () => {
                              const lastUser = [...messages].reverse().find((x) => x.role === 'user')
                              if (lastUser) send(lastUser.content)
                            }
                          : undefined
                      }
                    />
                  ) : null
                }
              />
            ))}

            {loading && showReasoning && (
              <div className="mb-4">
                <ThinkingIndicator activeStep={thinkingStep} />
              </div>
            )}

            {loading && (
              <div className="flex gap-3 mb-4">
                <GradientOrb state="thinking" size="sm" className="mt-1 hidden sm:block" />
                <div className="ai-bubble-assistant rounded-2xl rounded-bl-md border border-jos-border">
                  <TypingIndicator />
                </div>
                </div>
            )}

            <div ref={endRef} />
          </div>
        </div>

        {limitError && (
          <p className="text-jos-error text-xs px-4 pb-2 text-center" role="alert">
            {limitError}
          </p>
        )}

        <ChatInputBar
          value={input}
          onChange={setInput}
          onSend={send}
          onVoiceStart={startVoice}
          loading={loading}
          disabled={!!limitError && limitError.includes('limit')}
          aiState={aiState}
          quickPrompts={QUICK_PROMPTS}
          showChips={messages.length === 0}
        />
      </div>

      {/* Context sidebar — desktop always visible */}
      <div className="hidden lg:block">
        <ConversationSidebar
          open
          onClose={() => {}}
          profile={profile}
          messageCount={messages.length}
          personality={personality}
          onPersonalityChange={handlePersonalityChange}
        />
      </div>
      <div className="lg:hidden">
        <ConversationSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          profile={profile}
          messageCount={messages.length}
          personality={personality}
          onPersonalityChange={handlePersonalityChange}
        />
      </div>
    </div>
  )
}
