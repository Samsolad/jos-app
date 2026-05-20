import { askLLM } from './llm'

export async function generateDailyFocus(profile, projects, goals, habits, entries, priorityHint = []) {
  if (!profile) return null

  const today = new Date().toDateString()
  const hour  = new Date().getHours()

  // Build context
  const pendingTasks = projects.flatMap(p =>
    (p.tasks || [])
      .filter(t => !t.done && !t.blocked)
      .map(t => ({
        text:     t.text,
        project:  p.name,
        due:      t.due_date || null,
        daysLeft: t.due_date
          ? Math.ceil((new Date(t.due_date) - new Date()) / 86400000)
          : null,
      }))
  )

  const activeGoals = goals
    .filter(g => !g.done)
    .map(g => ({
      text:     g.text,
      category: g.category,
      deadline: g.deadline || null,
      daysLeft: g.deadline
        ? Math.ceil((new Date(g.deadline) - new Date()) / 86400000)
        : null,
      stepsLeft: (g.goal_steps || []).filter(s => !s.done).length,
    }))

  const habitsDue = habits.filter(() => true).map(h => h.name)

  const revenueIn  = entries.filter(e => e.type === 'in').reduce((s, e)  => s + Number(e.amount), 0)
  const revenueOut = entries.filter(e => e.type === 'out').reduce((s, e) => s + Number(e.amount), 0)

  const sys = `You are J·OS — ${profile.name?.split(' ')[0] || 'the user'}'s personal operating system and chief of staff.

Your job right now: analyse everything the user has on their plate and decide what they should focus on TODAY. You are not waiting to be asked. You are proactively setting their agenda.

About the user:
${profile.about || `Name: ${profile.name}. Role: ${profile.role || 'founder'}. Location: ${profile.location || 'UK'}.`}

Return ONLY a raw JSON object — no markdown, no backticks, no text outside the JSON:
{
  "greeting": "One sharp personalised sentence for this time of day. Reference something specific from their situation.",
  "summary": "One sentence overview of today — what kind of day this is based on their workload and deadlines.",
  "focus": [
    {
      "priority": 1,
      "title": "Short action title — max 8 words",
      "detail": "One sentence explaining exactly what to do and why it matters today specifically.",
      "type": "task" | "goal" | "habit" | "revenue" | "social",
      "urgency": "critical" | "high" | "medium" | "low",
      "project": "project name if applicable or null",
      "action": "projects" | "goals" | "habits" | "revenue" | "social" | "family" | "chat"
    }
  ],
  "watchout": "One honest sentence about the biggest risk or thing they are avoiding right now.",
  "momentum": "One sentence of genuine encouragement — specific to something real in their data."
}

Rules:
- Return exactly 3 focus items. No more, no less.
- Priority 1 is the most important thing they must do today.
- Be specific — use real project names, real task names, real goal names from the data.
- If something is overdue, it must be priority 1 or 2.
- If a goal deadline is within 7 days, it must appear.
- Do not pad with generic advice. Every item must be directly tied to their real data.
- The watchout must be honest — if they are avoiding something, name it.`

  const prompt = `Today: ${today}. Time: ${hour}:00.

PENDING TASKS (${pendingTasks.length} total):
${pendingTasks.slice(0, 15).map(t =>
  `- "${t.text}" [${t.project}]${t.daysLeft !== null ? ` — ${t.daysLeft <= 0 ? 'OVERDUE' : `due in ${t.daysLeft}d`}` : ''}`
).join('\n') || 'None'}

ACTIVE GOALS (${activeGoals.length}):
${activeGoals.map(g =>
  `- "${g.text}" (${g.category}) — ${g.stepsLeft} steps left${g.daysLeft !== null ? `, deadline in ${g.daysLeft}d` : ''}`
).join('\n') || 'None'}

HABITS TO LOG TODAY:
${habitsDue.join(', ') || 'None'}

REVENUE: £${revenueIn} in, £${revenueOut} out. Net: £${revenueIn - revenueOut}.

USER ABOUT: ${profile.about || 'Not set'}

PRIORITY ENGINE TOP TASKS (use these as strong hints for focus item 1–2):
${priorityHint.length
  ? priorityHint.map((item, i) =>
      `${i + 1}. [score ${item.score}] "${item.task.text}" (${item.project.name})`
    ).join('\n')
  : 'None scored yet'}
`

  const raw = await askLLM([{ role: 'user', content: prompt }], sys, true)
  return raw
}