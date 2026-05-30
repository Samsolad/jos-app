/** Template-based plan generation (no AI required). */

function step(text, order) {
  return { id: crypto.randomUUID(), text, done: false, order }
}

export function buildStepsFromIdea(idea) {
  const name = idea.trim().slice(0, 80) || 'your product'
  return [
    step(`Define the core problem ${name} solves and who feels it most`, 1),
    step('List MVP features — only what is needed for a first usable version', 2),
    step('Talk to 5–10 potential users; note what they would pay or use today', 3),
    step('Sketch the main user journey (signup → core action → outcome)', 4),
    step('Build the MVP core — one path, one outcome, no extras', 5),
    step('Run a small test with real users; collect bugs and confusion points', 6),
    step('Fix blockers and polish the one core flow', 7),
    step('Prepare to ship: hosting, domain, basic terms/privacy if needed', 8),
  ]
}

export function marketStepsFromIdea(idea) {
  const name = idea.trim().slice(0, 80) || 'your product'
  return [
    step(`Write one sentence: "${name} helps [who] do [what] without [pain]"`, 1),
    step('Create a simple landing page with a clear call to action', 2),
    step('Pick 1–2 channels where your users already spend time', 3),
    step('Draft 3 posts or outreach messages; schedule or send this week', 4),
    step('Reach out to 20 prospects personally (DM, email, or community)', 5),
    step('Get 5 people to try it or commit (beta, waitlist, or pay)', 6),
    step('Collect 2–3 quotes or feedback snippets for social proof', 7),
    step('Double down on what worked; cut what did not', 8),
  ]
}

export function createPlanFromIdea(idea) {
  return {
    idea: idea.trim(),
    build_steps: buildStepsFromIdea(idea),
    market_steps: marketStepsFromIdea(idea),
    adjustments: [],
  }
}

/** Simple template replan when circumstances change (no AI). */
export function replanWithTemplate(plan, changeDescription) {
  const note = changeDescription.trim()
  const pendingBuild = plan.build_steps.filter((s) => !s.done)
  const pendingMarket = plan.market_steps.filter((s) => !s.done)

  const insertStep = step(`Reassess plan: ${note}`, 0)
  insertStep.order = pendingBuild.length
    ? Math.min(...pendingBuild.map((s) => s.order)) - 1
    : 0

  const lower = note.toLowerCase()
  const extraBuild = []
  if (/budget|money|cost|funds/.test(lower)) {
    extraBuild.push(step('Cut scope to a smaller MVP that fits current budget', insertStep.order + 0.1))
  }
  if (/co-founder|partner|team|left|solo/.test(lower)) {
    extraBuild.push(step('List tasks you can defer or automate as a solo builder', insertStep.order + 0.2))
  }
  if (/time|deadline|delay|late/.test(lower)) {
    extraBuild.push(step('Reorder remaining steps by impact vs effort; drop lowest impact', insertStep.order + 0.3))
  }

  const newBuild = [
    ...plan.build_steps.filter((s) => s.done),
    insertStep,
    ...extraBuild,
    ...pendingBuild.map((s, i) => ({ ...s, order: insertStep.order + 1 + i + extraBuild.length })),
  ].sort((a, b) => a.order - b.order)

  const adjustments = [
    ...(plan.adjustments || []),
    { at: new Date().toISOString(), note },
  ]

  return {
    ...plan,
    build_steps: newBuild,
    market_steps: [...plan.market_steps],
    adjustments,
  }
}

export function getNextStep(plan) {
  if (!plan) return null
  const nextBuild = [...plan.build_steps].sort((a, b) => a.order - b.order).find((s) => !s.done)
  if (nextBuild) return { ...nextBuild, phase: 'build' }
  const nextMarket = [...plan.market_steps].sort((a, b) => a.order - b.order).find((s) => !s.done)
  if (nextMarket) return { ...nextMarket, phase: 'market' }
  return null
}

export function planProgress(plan) {
  if (!plan) return { done: 0, total: 0, pct: 0 }
  const all = [...plan.build_steps, ...plan.market_steps]
  const done = all.filter((s) => s.done).length
  const total = all.length
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
}
