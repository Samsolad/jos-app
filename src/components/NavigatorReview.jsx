import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useNavigatorStore from '../store/navigatorStore'
import useGoalStore from '../store/goalStore'
import useProjectStore from '../store/projectStore'
import useTaskStore from '../store/taskStore'
import { populateGoalToProject } from '../lib/populate'
import { sumBurnForecast } from '../lib/taskMeta'
import Button from './ui/Button'

function StepRow({ step, index, onRemove }) {
  const paid =
    step.is_paid &&
    (step.estimated_cost > 0 || /£[1-9]|\$[1-9]|[1-9]\d/.test(step.budget || ''))
  return (
    <div
      className={`flex gap-3 py-3 border-b border-[#1f1f1f] ${paid ? 'bg-[#ef4444]/[0.06]' : ''}`}
    >
      <span className="text-[#444] text-xs w-5 flex-shrink-0">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-light ${paid ? 'text-[#f87171]' : 'text-[#e8e8e8]'}`}>
          {step.text}
          {paid && (
            <span className="ml-2 text-[10px] font-semibold text-[#ef4444] uppercase tracking-wider">
              Paid · {step.budget || `£${step.estimated_cost}`}
            </span>
          )}
        </p>
        {step.lean_alternative && (
          <p className="text-[11px] text-[#4ade80] mt-1">Lean: {step.lean_alternative}</p>
        )}
        {step.timeframe && <p className="text-[10px] text-[#444] mt-0.5">⏱ {step.timeframe}</p>}
        {step.depends_on_index != null && (
          <p className="text-[10px] text-[#888] mt-0.5">↳ After step {step.depends_on_index + 1}</p>
        )}
      </div>
      <button type="button" onClick={() => onRemove(index)} className="text-[#444] hover:text-[#888] text-sm">
        ✕
      </button>
    </div>
  )
}

export default function NavigatorReview() {
  const { session, status, clear, updateProposal } = useNavigatorStore()
  const { addGoal } = useGoalStore()
  const { projects } = useProjectStore()
  const { addTask } = useTaskStore()
  const navigate = useNavigate()
  const [projectId, setProjectId] = useState(session?.populateProjectId || '')
  const [locking, setLocking] = useState(false)

  if (status !== 'review' || !session?.proposal) return null

  const { proposal, goalText, category } = session
  const burn = proposal.burn_forecast ?? sumBurnForecast(proposal.steps)

  const removeStep = (idx) => {
    const steps = proposal.steps.filter((_, i) => i !== idx)
    updateProposal({ ...proposal, steps, burn_forecast: sumBurnForecast(steps) })
  }

  const calcDeadline = (timeline) => {
    if (!timeline) return null
    const days = parseInt(timeline.match(/(\d+)\s*day/i)?.[1] || 0)
    const weeks = parseInt(timeline.match(/(\d+)\s*week/i)?.[1] || 0)
    const months = parseInt(timeline.match(/(\d+)\s*month/i)?.[1] || 0)
    const total = days || weeks * 7 || months * 30 || 90
    const d = new Date()
    d.setDate(d.getDate() + total)
    return d.toISOString().split('T')[0]
  }

  const handleLockAndPopulate = async () => {
    setLocking(true)
    const steps = proposal.steps.map((s) => ({
      text: s.text,
      timeframe: s.timeframe || '',
      budget: s.budget || '',
      estimated_cost: s.estimated_cost,
      is_paid: s.is_paid,
      lean_alternative: s.lean_alternative || '',
      depends_on_index: s.depends_on_index,
    }))

    await addGoal({
      text: goalText,
      category: category || 'Career',
      deadline: calcDeadline(proposal.timeline),
      timeline: proposal.timeline || '',
      budget: proposal.total_budget || '',
      reasoning: proposal.reasoning || '',
      burn_forecast: burn,
      steps,
    })

    if (projectId) {
      await populateGoalToProject(steps, projectId, addTask)
    }

    clear()
    setLocking(false)
    navigate(projectId ? '/projects' : '/goals')
  }

  return (
    <div className="mb-6 bg-[#111] border border-[#1f1f1f] rounded-md overflow-hidden animate-fadeUp">
      <div className="px-4 py-3 border-b border-[#1f1f1f] flex justify-between items-start gap-3">
        <div>
          <p className="text-[10px] tracking-[0.16em] uppercase text-[#444]">Review mode</p>
          <p className="text-[15px] font-semibold mt-0.5">{goalText}</p>
        </div>
        <Button variant="muted" size="xs" onClick={clear}>
          ✕
        </Button>
      </div>

      <div className="px-4 py-2 bg-[#181818] border-b border-[#1f1f1f] flex flex-wrap gap-4 text-[10px]">
        <span className="text-[#888]">⏱ {proposal.timeline}</span>
        <span className="text-[#888]">Budget {proposal.total_budget}</span>
        <span className="text-[#ef4444] font-medium">Burn forecast £{burn}</span>
      </div>

      <p className="px-4 py-2 text-[12px] text-[#888] font-light border-b border-[#1f1f1f]">
        {proposal.understanding}
      </p>

      <div className="px-4 max-h-[40vh] overflow-y-auto">
        {proposal.steps.map((s, i) => (
          <StepRow key={i} step={s} index={i} onRemove={removeStep} />
        ))}
      </div>

      <div className="px-4 py-4 border-t border-[#1f1f1f] space-y-3">
        <label className="block text-[10px] uppercase tracking-wider text-[#444]">
          Populate to project (execution dashboard)
        </label>
        <select
          className="w-full bg-[#181818] border border-[#2a2a2a] rounded py-2.5 px-3 text-white text-[13px]"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          <option value="">Goals only (no tasks)</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          <Button variant="green" size="md" onClick={handleLockAndPopulate} disabled={locking}>
            {locking ? '…' : 'Approve & populate'}
          </Button>
          <Button variant="muted" size="sm" onClick={() => navigate('/goals')}>
            Refine on Goals →
          </Button>
        </div>
      </div>
    </div>
  )
}
