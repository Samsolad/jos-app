import { useEffect, useState, useRef } from 'react'
import useGoalStore from '../../store/goalStore'
import useAuthStore from '../../store/authStore'
import { askClaude } from '../../lib/claude'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

const CAT_COLORS = {
  Career: '#60a5fa',
  Financial: '#4ade80',
  Personal: '#e8e8e8',
  Health: '#f87171',
  Relationships: '#c084fc',
  Learning: '#fbbf24',
  Other: '#888',
}

// ── GOAL CARD ──────────────────────────────────────────────────────
function GoalCard({ goal, onToggleStep, onDelete, onAdjust }) {
  const steps = goal.goal_steps || []
  const done = steps.filter(s => s.done).length
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0
  const color = CAT_COLORS[goal.category] || '#888'

  return (
    <div className={`bg-[#111] border border-[#1f1f1f] rounded-md p-4 sm:p-5 mb-4 ${goal.done ? 'opacity-40' : ''}`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className={`text-[15px] font-semibold tracking-tight mb-2 ${goal.done ? 'line-through' : ''}`}>
            {goal.text}
          </h3>
          <div className="flex flex-wrap gap-2">
            <span
              className="text-[9px] font-bold tracking-[0.1em] uppercase px-2 py-0.5 rounded-sm border"
              style={{ color, background: `${color}18`, borderColor: `${color}33` }}
            >
              {goal.category}
            </span>
            {goal.timeline && <Badge color="dim">⏱ {goal.timeline}</Badge>}
            {goal.budget && <Badge color="dim">💰 {goal.budget}</Badge>}
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          {!goal.done && (
            <Button variant="ghost" size="xs" onClick={onAdjust}>Adjust</Button>
          )}
          <Button variant="red" size="xs" onClick={onDelete}>✕</Button>
        </div>
      </div>

      {/* Progress */}
      {steps.length > 0 && (
        <>
          <div className="flex justify-between text-[10px] text-[#444] tracking-[0.08em] mb-1">
            <span>{done}/{steps.length} steps</span>
            <span>{pct}%</span>
          </div>
          <div className="h-px bg-[#1f1f1f] mb-4 overflow-hidden">
            <div className="h-full bg-white transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </>
      )}

      {/* Steps */}
      {steps.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] tracking-[0.16em] uppercase text-[#444] font-medium mb-2">Action Steps</p>
          {steps
            .sort((a, b) => a.position - b.position)
            .map(step => (
              <div
                key={step.id}
                onClick={() => onToggleStep(goal.id, step.id)}
                className={`flex items-start gap-3 py-2.5 border-b border-[#1f1f1f] cursor-pointer group ${step.done ? 'opacity-35' : ''}`}
              >
                <div className={`w-[14px] h-[14px] rounded-[3px] border flex-shrink-0 flex items-center justify-center mt-0.5 transition-all ${step.done ? 'border-white bg-white' : 'border-[#2a2a2a] group-hover:border-[#444]'}`}>
                  {step.done && <span className="text-[9px] font-bold text-[#080808]">✓</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-light leading-relaxed ${step.done ? 'line-through text-[#444]' : 'text-[#e8e8e8]'}`}>
                    {step.text}
                  </p>
                  {(step.timeframe || step.budget) && (
                    <div className="flex gap-3 mt-1">
                      {step.timeframe && <span className="text-[10px] text-[#444]">⏱ {step.timeframe}</span>}
                      {step.budget && <span className="text-[10px] text-[#444]">💰 {step.budget}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* No steps yet */}
      {steps.length === 0 && !goal.done && (
        <button
          onClick={onAdjust}
          className="text-[12px] text-[#444] hover:text-[#888] transition-colors"
        >
          + Build plan with J·OS →
        </button>
      )}

      {/* Reasoning */}
      {goal.reasoning && (
        <div className="mt-3 p-3 bg-[#3b82f6]/[0.06] border border-[#3b82f6]/[0.12] rounded text-[12px] text-[#888] font-light leading-relaxed">
          💡 {goal.reasoning}
        </div>
      )}
    </div>
  )
}

// ── CHAT BUBBLE ────────────────────────────────────────────────────
function ChatBubble({ role, text }) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[85%] px-4 py-3 rounded-lg text-[13px] leading-relaxed font-light whitespace-pre-wrap ${
        role === 'user'
          ? 'bg-white text-[#080808] font-normal'
          : 'bg-[#181818] border border-[#2a2a2a] text-[#e8e8e8]'
      }`}>
        {text}
      </div>
    </div>
  )
}

// ── MAIN PAGE ──────────────────────────────────────────────────────
export default function Goals() {
  const { goals, loading, fetchGoals, addGoal, updateGoal, deleteGoal, toggleGoalStep, updateGoalSteps } = useGoalStore()
  const profile = useAuthStore(s => s.profile)

  // Planning session state
  const [session, setSession] = useState(null)
  /*
  session = {
    goalText, category, context,
    proposal: { steps[], timeline, total_budget, reasoning, understanding, reality_check },
    chatHistory: [{role, content}],
    agreedPlan: null,
    editingGoalId: null  // set when adjusting existing goal
  }
  */
  const [planStep, setPlanStep] = useState('idle') // idle | analysing | chatting | agreed
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [goalText, setGoalText] = useState('')
  const [goalCat, setGoalCat] = useState('Career')
  const [goalCtx, setGoalCtx] = useState('')
  const chatEndRef = useRef(null)

  useEffect(() => { fetchGoals() }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [session?.chatHistory])

  // ── STEP 1: Analyse goal ────────────────────────────────────────
  const handleAnalyse = async () => {
    if (!goalText.trim()) return
    setPlanStep('analysing')

    const sys = `You are J·OS, an honest and sharp life advisor and project manager.
A user has shared a goal. Analyse it and propose a realistic plan.
Return ONLY raw JSON — absolutely no markdown, no backticks, no text outside the JSON object:
{
  "understanding": "One sentence showing you truly understand what they want to achieve",
  "reality_check": "One honest sentence about what makes this hard",
  "steps": [
    {"text": "Step description", "timeframe": "e.g. Week 1-2", "budget": "e.g. £0 or £200"}
  ],
  "timeline": "Total suggested timeline e.g. 3 months",
  "total_budget": "Total estimated budget e.g. £500",
  "budget_breakdown": "One sentence explaining the spend",
  "reasoning": "One sentence of mentor advice — what will make or break this goal"
}
Give 4-8 specific, sequenced, actionable steps. Be realistic.`

    const prompt = `Goal: "${goalText.trim()}"
Category: ${goalCat}
Context: ${goalCtx.trim() || 'none'}
User role: ${profile?.role || 'professional'}, based in ${profile?.location || 'UK'}`

    const proposal = await askClaude([{ role: 'user', content: prompt }], sys, true)

    if (!proposal || !proposal.steps) {
      setPlanStep('idle')
      return
    }

    const firstMsg = `Here's my analysis of your goal: "${goalText.trim()}"

**My understanding:** ${proposal.understanding}

**Reality check:** ${proposal.reality_check}

**Proposed plan:** ${proposal.steps.length} steps over ${proposal.timeline}. Estimated budget: ${proposal.total_budget}.

${proposal.budget_breakdown}

**Mentor insight:** ${proposal.reasoning}

Does this plan work for you? Tell me if you want to adjust the timeline, change the budget, simplify the steps, or anything else. We'll agree on this together before locking it in.`

    setSession({
      goalText: goalText.trim(),
      category: goalCat,
      context: goalCtx.trim(),
      proposal,
      chatHistory: [{ role: 'assistant', content: firstMsg }],
      agreedPlan: null,
      editingGoalId: null,
    })

    setPlanStep('chatting')
  }

  // ── STEP 2: Chat to refine ──────────────────────────────────────
  const handleChat = async () => {
    if (!chatInput.trim() || !session) return
    const msg = chatInput.trim()
    setChatInput('')
    setChatLoading(true)

    const updatedHistory = [
      ...session.chatHistory,
      { role: 'user', content: msg },
    ]

    setSession(s => ({ ...s, chatHistory: updatedHistory }))

    const sys = `You are J·OS — a sharp, honest AI advisor helping refine a goal plan.

Goal: "${session.goalText}"
Current plan:
- Steps: ${session.proposal.steps.map((s, i) => `${i + 1}. ${s.text} (${s.timeframe || '?'}, ${s.budget || '£0'})`).join('; ')}
- Timeline: ${session.proposal.timeline}
- Budget: ${session.proposal.total_budget}

Rules:
- Adjust timeline, budget, or steps based on what the user asks
- Be specific about what changed
- When the user is happy and agrees, end your message with exactly: [PLAN_AGREED]
- Trigger [PLAN_AGREED] when they say things like "looks good", "agreed", "let's go", "perfect", "that works", "I'm happy with this"
- When triggering [PLAN_AGREED], summarise the final agreed plan first
- Stay direct and mentor-like throughout`

    const reply = await askClaude(updatedHistory, sys)
    setChatLoading(false)

    const agreed = reply.includes('[PLAN_AGREED]')
    const cleanReply = reply.replace('[PLAN_AGREED]', '').trim()

    const finalHistory = [
      ...updatedHistory,
      { role: 'assistant', content: cleanReply },
    ]

    setSession(s => ({
      ...s,
      chatHistory: finalHistory,
      agreedPlan: agreed ? s.proposal : s.agreedPlan,
    }))

    if (agreed) setPlanStep('agreed')
  }

  // ── STEP 3: Lock in ────────────────────────────────────────────
  const handleLockIn = async () => {
    if (!session) return
    const plan = session.agreedPlan || session.proposal

    const steps = plan.steps.map(s => ({
      text: s.text,
      timeframe: s.timeframe || '',
      budget: s.budget || '',
    }))

    const deadline = calcDeadline(plan.timeline)

    if (session.editingGoalId) {
      // Updating existing goal
      await updateGoal(session.editingGoalId, {
        timeline: plan.timeline || '',
        budget: plan.total_budget || '',
        deadline,
        reasoning: session.proposal.reasoning || '',
        chat_history: session.chatHistory,
      })
      await updateGoalSteps(session.editingGoalId, steps)
    } else {
      // New goal
      await addGoal({
        text: session.goalText,
        category: session.category,
        deadline,
        timeline: plan.timeline || '',
        budget: plan.total_budget || '',
        reasoning: session.proposal.reasoning || '',
        chat_history: session.chatHistory,
        steps,
      })
    }

    // Reset
    setSession(null)
    setPlanStep('idle')
    setGoalText('')
    setGoalCat('Career')
    setGoalCtx('')
  }

  // ── Open adjust panel for existing goal ────────────────────────
  const handleAdjust = (goal) => {
    const steps = (goal.goal_steps || [])
      .sort((a, b) => a.position - b.position)
      .map(s => ({ text: s.text, timeframe: s.timeframe, budget: s.budget }))

    setSession({
      goalText: goal.text,
      category: goal.category,
      context: '',
      proposal: {
        steps,
        timeline: goal.timeline || '',
        total_budget: goal.budget || '',
        reasoning: goal.reasoning || '',
        understanding: '',
        reality_check: '',
        budget_breakdown: '',
      },
      chatHistory: [
        {
          role: 'assistant',
          content: `We're revisiting your plan for "${goal.text}". Current: ${goal.timeline || 'no timeline'}, ${goal.budget || 'no budget set'}. What would you like to change — timeline, budget, steps, or something else?`
        }
      ],
      agreedPlan: null,
      editingGoalId: goal.id,
    })
    setPlanStep('chatting')
  }

  const handleCancel = () => {
    setSession(null)
    setPlanStep('idle')
    setGoalText('')
    setGoalCtx('')
  }

  const calcDeadline = (timeline) => {
    if (!timeline) return null
    const months = parseInt(timeline.match(/(\d+)\s*month/i)?.[1] || 0)
    const weeks = parseInt(timeline.match(/(\d+)\s*week/i)?.[1] || 0)
    const days = (months * 30) + (weeks * 7) || 90
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toISOString().split('T')[0]
  }

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <div className="animate-fadeUp max-w-2xl">
      <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium mb-2">Ambition</p>
      <h1 className="font-serif text-[24px] sm:text-[26px] font-bold mb-1">
        Goals & <em className="text-[#e8e8e8]">Plans</em>
      </h1>
      <p className="text-[13px] text-[#888] font-light mb-6">
        Tell J·OS your goal. We'll build the plan together.
      </p>

      {/* ── PLANNING SESSION ── */}
      {planStep !== 'idle' && session && (
        <div className="mb-6">
          {/* Analysing state */}
          {planStep === 'analysing' && (
            <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-5 flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-[#2a2a2a] border-t-white rounded-full animate-spin flex-shrink-0" />
              <p className="text-[13px] text-[#888] font-light">J·OS is analysing your goal…</p>
            </div>
          )}

          {/* Chat panel */}
          {(planStep === 'chatting' || planStep === 'agreed') && (
            <div className="bg-[#111] border border-[#1f1f1f] rounded-md overflow-hidden">
              {/* Session header */}
              <div className="px-4 py-3 border-b border-[#1f1f1f] flex items-center justify-between">
                <div>
                  <p className="text-[10px] tracking-[0.16em] uppercase text-[#444] font-medium">
                    {session.editingGoalId ? 'Adjusting Plan' : 'Goal Planning Session'}
                  </p>
                  <p className="text-[13px] font-medium mt-0.5 truncate">{session.goalText}</p>
                </div>
                <Button variant="muted" size="xs" onClick={handleCancel}>✕ Cancel</Button>
              </div>

              {/* Proposal summary bar */}
              {session.proposal.timeline && (
                <div className="px-4 py-2.5 bg-[#181818] border-b border-[#1f1f1f] flex gap-4 flex-wrap">
                  <span className="text-[10px] text-[#444]">
                    ⏱ <span className="text-[#888]">{session.proposal.timeline}</span>
                  </span>
                  <span className="text-[10px] text-[#444]">
                    💰 <span className="text-[#888]">{session.proposal.total_budget}</span>
                  </span>
                  <span className="text-[10px] text-[#444]">
                    📋 <span className="text-[#888]">{session.proposal.steps.length} steps</span>
                  </span>
                </div>
              )}

              {/* Chat messages */}
              <div className="p-4 max-h-[50vh] overflow-y-auto">
                {session.chatHistory.map((m, i) => (
                  <ChatBubble key={i} role={m.role} text={m.content} />
                ))}
                {chatLoading && (
                  <div className="flex justify-start mb-3">
                    <div className="bg-[#181818] border border-[#2a2a2a] rounded-lg px-4 py-3 flex gap-1.5">
                      {[0, 0.2, 0.4].map((d, i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-[#444] animate-bounce"
                          style={{ animationDelay: `${d}s` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Agreed — show lock-in button */}
              {planStep === 'agreed' && (
                <div className="px-4 py-3 border-t border-[#1f1f1f] bg-[#22c55e]/[0.05]">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button variant="green" size="md" onClick={handleLockIn}>
                      ✓ Lock In This Plan
                    </Button>
                    <Button variant="muted" size="xs" onClick={() => setPlanStep('chatting')}>
                      Keep Adjusting
                    </Button>
                  </div>
                </div>
              )}

              {/* Chat input */}
              {planStep === 'chatting' && (
                <div className="px-4 py-3 border-t border-[#1f1f1f] flex gap-2">
                  <input
                    className="flex-1 bg-[#181818] border border-[#2a2a2a] rounded py-2.5 px-3 text-white text-[13px] font-light outline-none focus:border-[#333] placeholder:text-[#444]"
                    placeholder='e.g. "Make it 6 months", "I only have £200"…'
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !chatLoading && handleChat()}
                    disabled={chatLoading}
                  />
                  <Button
                    variant="solid"
                    size="sm"
                    onClick={handleChat}
                    disabled={chatLoading || !chatInput.trim()}
                  >
                    →
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── GOALS LIST ── */}
      {loading && goals.length === 0 && (
        <div className="flex justify-center py-10">
          <div className="w-5 h-5 border-2 border-[#2a2a2a] border-t-white rounded-full animate-spin" />
        </div>
      )}

      {!loading && goals.length === 0 && planStep === 'idle' && (
        <div className="text-center py-10 text-[#444]">
          <p className="text-[28px] mb-2">◈</p>
          <p className="text-[13px] font-light">No goals yet. Add one below.</p>
        </div>
      )}

      {goals.map(g => (
        <GoalCard
          key={g.id}
          goal={g}
          onToggleStep={toggleGoalStep}
          onDelete={async () => {
            if (confirm('Delete this goal and its plan?')) await deleteGoal(g.id)
          }}
          onAdjust={() => handleAdjust(g)}
        />
      ))}

      {/* ── ADD NEW GOAL FORM ── */}
      {planStep === 'idle' && (
        <>
          <div className="h-px bg-[#1f1f1f] my-6" />
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium mb-4">
            {goals.length > 0 ? 'Add Another Goal' : 'Add Your First Goal'}
          </p>
          <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-4 sm:p-5">
            <input
              className="w-full bg-[#181818] border border-[#2a2a2a] rounded py-3 px-4 text-white text-[14px] font-light outline-none focus:border-[#333] placeholder:text-[#444] mb-3"
              placeholder="What do you want to achieve? Be specific."
              value={goalText}
              onChange={e => setGoalText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && goalText.trim() && handleAnalyse()}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <select
                className="bg-[#181818] border border-[#2a2a2a] rounded py-2.5 px-3 text-white text-[13px] font-light outline-none focus:border-[#333]"
                value={goalCat}
                onChange={e => setGoalCat(e.target.value)}
              >
                {Object.keys(CAT_COLORS).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                className="bg-[#181818] border border-[#2a2a2a] rounded py-2.5 px-3 text-white text-[13px] font-light outline-none focus:border-[#333] placeholder:text-[#444]"
                placeholder="Any context? (optional)"
                value={goalCtx}
                onChange={e => setGoalCtx(e.target.value)}
              />
            </div>
            <Button
              variant="solid"
              size="md"
              onClick={handleAnalyse}
              disabled={!goalText.trim() || planStep === 'analysing'}
            >
              {planStep === 'analysing'
                ? <><span className="w-3 h-3 border-2 border-[#08080833] border-t-[#080808] rounded-full animate-spin" /> Analysing…</>
                : 'Analyse & Plan with J·OS →'
              }
            </Button>
          </div>
        </>
      )}
    </div>
  )
}