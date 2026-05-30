import { useEffect, useState } from 'react'
import usePlanStore from '../../store/planStore'
import { getNextStep, planProgress } from '../../lib/planTemplates'
import Button from '../../components/ui/Button'

function StepList({ title, phase, steps, onToggle, saving }) {
  const sorted = [...steps].sort((a, b) => a.order - b.order)
  return (
    <section className="jos-card p-4 sm:p-5">
      <h2 className="jos-label mb-3">{title}</h2>
      <ol className="space-y-2">
        {sorted.map((s) => (
          <li key={s.id}>
            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                s.done
                  ? 'border-jos-border/50 bg-jos-surface/30 opacity-60'
                  : 'border-jos-border hover:border-jos-accent/30 bg-jos-surface'
              }`}
            >
              <input
                type="checkbox"
                checked={s.done}
                disabled={saving}
                onChange={() => onToggle(phase, s.id)}
                className="mt-1 accent-jos-accent"
              />
              <span className={`text-[13px] leading-relaxed ${s.done ? 'line-through text-jos-muted' : 'text-jos-text'}`}>
                {s.text}
              </span>
            </label>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function Plan() {
  const { plan, loading, saving, error, fetchPlan, createPlan, toggleStep, replan, resetPlan } = usePlanStore()
  const [idea, setIdea] = useState('')
  const [change, setChange] = useState('')
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    fetchPlan()
  }, [fetchPlan])

  const next = getNextStep(plan)
  const progress = planProgress(plan)

  const handleCreate = async (e) => {
    e.preventDefault()
    setLocalError('')
    try {
      await createPlan(idea)
      setIdea('')
    } catch (err) {
      setLocalError(err.message)
    }
  }

  const handleReplan = async (e) => {
    e.preventDefault()
    setLocalError('')
    try {
      await replan(change)
      setChange('')
    } catch (err) {
      setLocalError(err.message)
    }
  }

  const handleReset = async () => {
    if (!window.confirm('Start a new idea? Your current plan will be deleted.')) return
    await resetPlan()
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-jos-border border-t-jos-accent rounded-full animate-spin" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="max-w-xl mx-auto animate-fadeUp">
        <p className="jos-label mb-2">Your plan</p>
        <h1 className="font-serif text-[26px] sm:text-[32px] font-bold mb-2">
          Turn an idea into a product
        </h1>
        <p className="text-[14px] text-jos-muted font-light mb-8 leading-relaxed">
          Describe your idea. J·OS breaks it into build steps, then marketing steps — and always shows you what&apos;s next.
        </p>

        <form onSubmit={handleCreate} className="jos-card p-5 sm:p-6">
          <label className="block text-[11px] uppercase tracking-wider text-jos-muted mb-2">
            Your idea
          </label>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="e.g. A mobile app that helps freelancers track invoices and get paid faster"
            className="w-full min-h-[120px] bg-jos-surface border border-jos-border rounded-lg px-4 py-3 text-[14px] text-jos-text outline-none focus:border-jos-accent resize-none mb-4"
          />
          {(localError || error) && (
            <p className="text-jos-error text-xs mb-3">{localError || error}</p>
          )}
          <Button type="submit" size="full" disabled={saving || !idea.trim()}>
            {saving ? 'Creating plan…' : 'Create my plan'}
          </Button>
        </form>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fadeUp pb-8">
      <div>
        <p className="jos-label mb-1">Active plan</p>
        <h1 className="font-serif text-[22px] sm:text-[28px] font-bold leading-snug mb-1">
          {plan.idea}
        </h1>
        <p className="text-[12px] text-jos-muted">
          {progress.done} of {progress.total} steps done · {progress.pct}%
        </p>
      </div>

      {next ? (
        <div className="jos-card p-5 border-jos-accent/40 bg-jos-accent/5">
          <p className="jos-label text-jos-accent mb-2">Up next</p>
          <p className="text-[11px] uppercase tracking-wider text-jos-muted mb-1">
            {next.phase === 'build' ? 'Build the product' : 'Get to market'}
          </p>
          <p className="text-[15px] sm:text-[17px] font-medium leading-relaxed text-jos-text">
            {next.text}
          </p>
        </div>
      ) : (
        <div className="jos-card p-5 border-jos-success/30 bg-jos-success/5">
          <p className="text-jos-success font-semibold text-[15px]">Plan complete 🎉</p>
          <p className="text-[13px] text-jos-muted mt-1">You finished every step. Start a new idea when ready.</p>
        </div>
      )}

      <StepList
        title="Build the product"
        phase="build"
        steps={plan.build_steps}
        onToggle={toggleStep}
        saving={saving}
      />

      <StepList
        title="Get to market"
        phase="market"
        steps={plan.market_steps}
        onToggle={toggleStep}
        saving={saving}
      />

      <form onSubmit={handleReplan} className="jos-card p-5">
        <h2 className="jos-label mb-2">Something changed?</h2>
        <p className="text-[12px] text-jos-muted mb-3 leading-relaxed">
          Describe what happened — budget cut, timeline shift, co-founder left — and your remaining steps will be rearranged.
        </p>
        <textarea
          value={change}
          onChange={(e) => setChange(e.target.value)}
          placeholder="e.g. Budget cut in half — need a leaner MVP"
          className="w-full min-h-[80px] bg-jos-surface border border-jos-border rounded-lg px-4 py-3 text-[13px] outline-none focus:border-jos-accent resize-none mb-3"
        />
        {(localError || error) && (
          <p className="text-jos-error text-xs mb-2">{localError || error}</p>
        )}
        <Button type="submit" variant="ghost" size="sm" disabled={saving || !change.trim()}>
          {saving ? 'Replanning…' : 'Rearrange remaining steps'}
        </Button>
      </form>

      <div className="text-center pt-2">
        <button
          type="button"
          onClick={handleReset}
          className="text-[11px] text-jos-muted hover:text-jos-error transition-colors"
        >
          Start a new idea
        </button>
      </div>
    </div>
  )
}
