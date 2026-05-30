import { askLLM } from './llm'
import { replanWithTemplate } from './planTemplates'

const REPLAN_SYSTEM = `You help founders replan a product roadmap when circumstances change.
Return ONLY valid JSON with this shape:
{
  "build_steps": [{"text": "step description"}],
  "market_steps": [{"text": "step description"}]
}
Include only REMAINING work (not yet completed). Keep steps concrete and actionable.
Preserve completed work — do not repeat finished steps.`

export async function replanSteps(plan, changeDescription) {
  const pendingBuild = plan.build_steps.filter((s) => !s.done)
  const pendingMarket = plan.market_steps.filter((s) => !s.done)
  const doneBuild = plan.build_steps.filter((s) => s.done).map((s) => s.text)
  const doneMarket = plan.market_steps.filter((s) => s.done).map((s) => s.text)

  const prompt = [
    `Idea: ${plan.idea}`,
    `What changed: ${changeDescription}`,
    `Already done (build): ${doneBuild.join('; ') || 'none'}`,
    `Already done (market): ${doneMarket.join('; ') || 'none'}`,
    `Remaining build steps before change: ${pendingBuild.map((s) => s.text).join('; ') || 'none'}`,
    `Remaining market steps before change: ${pendingMarket.map((s) => s.text).join('; ') || 'none'}`,
    'Rewrite the remaining build_steps and market_steps to fit the new situation.',
  ].join('\n')

  try {
    const result = await askLLM(
      [{ role: 'user', content: prompt }],
      REPLAN_SYSTEM,
      true,
    )
    if (result?.build_steps?.length || result?.market_steps?.length) {
      const toStep = (text, order) => ({
        id: crypto.randomUUID(),
        text: String(text).slice(0, 500),
        done: false,
        order,
      })
      return {
        ...plan,
        build_steps: [
          ...plan.build_steps.filter((s) => s.done),
          ...(result.build_steps || []).map((s, i) => toStep(s.text || s, i + 1)),
        ],
        market_steps: [
          ...plan.market_steps.filter((s) => s.done),
          ...(result.market_steps || []).map((s, i) => toStep(s.text || s, i + 1)),
        ],
        adjustments: [
          ...(plan.adjustments || []),
          { at: new Date().toISOString(), note: changeDescription.trim(), source: 'ai' },
        ],
      }
    }
  } catch {
    /* fall through to template */
  }

  const updated = replanWithTemplate(plan, changeDescription)
  const last = updated.adjustments?.[updated.adjustments.length - 1]
  if (last) last.source = 'template'
  return updated
}
