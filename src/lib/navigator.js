import { askLLM } from './llm'
import { INTENT_SYSTEM, DECOMPOSE_SYSTEM } from './navigatorPrompts'
import { sumBurnForecast, parseCostFromBudget } from './taskMeta'

export async function classifyIntent(text, projects = []) {
  const projectList = projects.map((p) => p.name).join(', ') || 'none'
  const result = await askLLM(
    [{ role: 'user', content: `Projects: ${projectList}\n\nInput: "${text}"` }],
    INTENT_SYSTEM,
    true,
  )
  if (!result?.intent) {
    const lower = text.toLowerCase()
    if (/\b(by|before|today|tomorrow|\d{1,2}(:\d{2})?\s*(am|pm)?)\b/i.test(text)) {
      return { intent: 'task', task_text: text, confidence: 0.6 }
    }
    if (/\b(pause|urgent|crisis|double-book|emergency)\b/i.test(lower)) {
      return { intent: 'pivot', goal_text: text, confidence: 0.6 }
    }
    return { intent: 'goal', goal_text: text, confidence: 0.5 }
  }
  return result
}

export async function decomposeGoal(goalText, context = '', profile = {}) {
  const prompt = `Goal: "${goalText}"
Context: ${context || 'none'}
Role: ${profile?.role || 'founder'}, ${profile?.location || 'UK'}
Currency: ${profile?.currency || '£'}`

  const proposal = await askLLM([{ role: 'user', content: prompt }], DECOMPOSE_SYSTEM, true)
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
  const active = projects.find((p) =>
    /active|critical/i.test(p.status || ''),
  )
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
