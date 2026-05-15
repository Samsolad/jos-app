import { askLLM } from './llm'
import { DECOMPOSE_SYSTEM, INTENT_SYSTEM } from './navigatorPrompts'
import { sumBurnForecast, parseCostFromBudget } from './taskMeta'

/** Fast local routing — no network; avoids spinner when edge function is down. */
export function classifyIntentLocal(text) {
  const lower = text.toLowerCase().trim()
  if (!lower) return null

  if (
    /\b(pause|paused|crisis|emergency|urgent|double-?book|cancel everything|stop everything)\b/i.test(
      lower,
    )
  ) {
    return {
      intent: 'pivot',
      goal_text: text,
      pivot_trigger: text,
      confidence: 0.9,
    }
  }

  const hasDeadline =
    /\b(by|before|today|tomorrow|tonight|noon|midnight)\b/i.test(lower) ||
    /\b\d{1,2}(:\d{2})?\s*(am|pm)\b/i.test(lower) ||
    /\b\d{1,2}\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(lower)

  const looksLikeTask =
    hasDeadline ||
    (/^(pay|send|call|email|book|fix|review|submit|complete|finish)\b/i.test(lower) &&
      lower.length < 220)

  if (looksLikeTask) {
    return {
      intent: 'task',
      task_text: text,
      due_iso: null,
      confidence: 0.88,
    }
  }

  if (
    /\b(launch|in \d+\s*days?|within \d+\s*weeks?|goal|roadmap|sprint|venture|competitor)\b/i.test(
      lower,
    ) ||
    lower.length > 120
  ) {
    return { intent: 'goal', goal_text: text, confidence: 0.75 }
  }

  return null
}

export async function classifyIntent(text, projects = []) {
  const local = classifyIntentLocal(text)
  if (local && local.confidence >= 0.85) {
    return local
  }

  const projectList = projects.map((p) => p.name).join(', ') || 'none'
  try {
    const result = await askLLM(
      [{ role: 'user', content: `Projects: ${projectList}\n\nInput: "${text}"` }],
      INTENT_SYSTEM,
      true,
    )
    if (result?.intent) return result
  } catch (err) {
    console.warn('[navigator] AI classify failed, using local rules:', err?.message)
  }

  return (
    local || {
      intent: 'goal',
      goal_text: text,
      confidence: 0.5,
    }
  )
}

export async function decomposeGoal(goalText, context = '', profile = {}) {
  const prompt = `Goal: "${goalText}"
Context: ${context || 'none'}
Role: ${profile?.role || 'founder'}, ${profile?.location || 'UK'}
Currency: ${profile?.currency || '£'}`

  let proposal
  try {
    proposal = await askLLM([{ role: 'user', content: prompt }], DECOMPOSE_SYSTEM, true)
  } catch (err) {
    console.error('[navigator] decompose failed:', err)
    throw err
  }

  if (!proposal?.steps) return null

  const steps = proposal.steps.map((s, i) => ({
    text: s.text,
    timeframe: s.timeframe || '',
    budget: s.budget || (s.is_paid ? `£${s.estimated_cost || 0}` : '£0'),
    estimated_cost: s.estimated_cost ?? parseCostFromBudget(s.budget),
    is_paid: Boolean(s.is_paid),
    lean_alternative: s.lean_alternative || '',
    depends_on_index:
      s.depends_on_index === null || s.depends_on_index === undefined
        ? null
        : Number(s.depends_on_index),
    position: i,
  }))

  const burn = proposal.burn_forecast ?? sumBurnForecast(steps)

  return {
    ...proposal,
    steps,
    burn_forecast: burn,
    total_budget: proposal.total_budget || `£${burn}`,
  }
}

export function pickProjectForTask(projects, hint) {
  if (!projects.length) return null
  if (hint) {
    const match = projects.find((p) =>
      p.name.toLowerCase().includes(hint.toLowerCase()),
    )
    if (match) return match
  }
  const active = projects.find((p) => /active|critical/i.test(p.status || ''))
  return active || projects[0]
}

export function parseDueFromIntent(dueIso) {
  if (!dueIso) return null
  try {
    const d = new Date(dueIso)
    if (Number.isNaN(d.getTime())) return null
    return d.toISOString().split('T')[0]
  } catch {
    return null
  }
}
