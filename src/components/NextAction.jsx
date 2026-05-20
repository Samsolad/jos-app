import { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import useProjectStore from '../store/projectStore'
import useTaskStore from '../store/taskStore'
import useGoalStore from '../store/goalStore'
import useAuthStore from '../store/authStore'
import useMentorStore from '../store/mentorStore'
import { getNextAction, getTopActions, getUrgency } from '../lib/scoring'
import { trackEvent, EVENT_TYPES } from '../lib/behaviour'
import PriorityFactors from './PriorityFactors'

export default function NextAction() {
  const navigate   = useNavigate()
  const { projects, fetchProjects } = useProjectStore()
  const { tasks }  = useTaskStore()
  const { goals }  = useGoalStore()
  const profile    = useAuthStore(s => s.profile)
  const { trigger } = useMentorStore()

  const [expanded, setExpanded] = useState(false)
  const [skipped,  setSkipped]  = useState([])
  const [rescheduling, setRescheduling] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const spokenRef = useRef(false)

  const projectsWithTasks = useMemo(
    () =>
      projects.map(p => ({
        ...p,
        tasks: tasks[p.id] || [],
      })),
    [projects, tasks],
  )

  const filtered = useMemo(
    () =>
      projectsWithTasks.map(p => ({
        ...p,
        tasks: (p.tasks || []).filter(t => !skipped.includes(t.id)),
      })),
    [projectsWithTasks, skipped],
  )

  const scoreContext = useMemo(() => ({ goals }), [goals])

  const tasksByProject = useMemo(
    () => Object.fromEntries(filtered.map((p) => [p.id, p.tasks || []])),
    [filtered],
  )

  const next = useMemo(
    () => getNextAction(filtered, tasksByProject, scoreContext),
    [filtered, tasksByProject, scoreContext],
  )
  const top = useMemo(
    () => getTopActions(filtered, tasksByProject, 5, scoreContext),
    [filtered, tasksByProject, scoreContext],
  )

  useEffect(() => {
    if (!next || !profile || spokenRef.current) return
    spokenRef.current = true
    const urgency = getUrgency(next.score)
    if (urgency.label === 'Critical' || urgency.label === 'High') {
      const t = setTimeout(() => {
        trigger(
          urgency.label === 'Critical' ? 'idle' : 'next_task',
          {
            task:    next.task.text,
            project: next.project.name,
          },
          profile,
        )
      }, 3000)
      return () => clearTimeout(t)
    }
  }, [next, profile, trigger])

  const handleStartNow = () => {
    if (!next) return
    navigate('/projects')
  }

  const handleSkip = () => {
    if (!next) return
    trackEvent(EVENT_TYPES.TASK_SKIPPED, {
      taskId: next.task.id,
      entityType: 'task',
      projectId: next.project.id,
    })
    setSkipped(s => [...s, next.task.id])
    spokenRef.current = false
  }

  const handleReschedule = async () => {
    if (!rescheduleDate || !next) return
    const { updateTask } = useTaskStore.getState()
    await updateTask(next.project.id, next.task.id, {
      due_date: rescheduleDate,
    })
    trackEvent(EVENT_TYPES.TASK_RESCHEDULED, {
      taskId: next.task.id,
      entityType: 'task',
      due_date: rescheduleDate,
    })
    setRescheduling(false)
    setRescheduleDate('')
    await fetchProjects()
  }

  if (!next) {
    return (
      <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-5 mb-6">
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium mb-2">
          Next Action
        </p>
        <p className="text-[13px] text-[#444] font-light">
          No pending tasks. Add projects and tasks to get started.
        </p>
      </div>
    )
  }

  const urgency = getUrgency(next.score)
  const daysLeft = next.task.due_date
    ? Math.ceil((new Date(next.task.due_date) - new Date()) / 86400000)
    : null

  return (
    <div className="mb-6">
      {/* ── MAIN NEXT ACTION CARD ── */}
      <div
        className="bg-[#111] border rounded-md overflow-hidden"
        style={{ borderColor: `${urgency.color}33` }}
      >
        {/* Top bar */}
        <div
          className="h-[2px]"
          style={{ background: urgency.color }}
        />

        <div className="p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-[#444]">
              Next Action
            </p>
            <span
              className="text-[9px] font-bold tracking-[0.12em] uppercase px-2.5 py-1 rounded-sm border flex-shrink-0"
              style={{
                color:            urgency.color,
                background:       `${urgency.color}18`,
                borderColor:      `${urgency.color}44`,
              }}
            >
              {urgency.label === 'Critical' && '🔴 '}
              {urgency.label === 'High'     && '🟡 '}
              {urgency.label === 'Medium'   && '⚪ '}
              {urgency.label === 'Low'      && '🔵 '}
              {urgency.label}
            </span>
          </div>

          {/* Task text */}
          <p className="text-[16px] sm:text-[17px] font-semibold leading-snug mb-3 tracking-tight">
            {next.task.text}
          </p>

          {/* Meta */}
          <div className="flex flex-wrap gap-3 mb-4 text-[11px] text-[#888] font-light">
            <span>
              📁 {next.project.name}
            </span>
            {daysLeft !== null && (
              <span style={{ color: daysLeft <= 0 ? '#ef4444' : daysLeft <= 3 ? '#f59e0b' : '#888' }}>
                📅 {daysLeft <= 0
                  ? 'Overdue'
                  : daysLeft === 1
                    ? 'Due tomorrow'
                    : `Due in ${daysLeft}d`}
              </span>
            )}
            {next.task.update_note && (
              <span className="text-[#444] italic">↳ {next.task.update_note}</span>
            )}
          </div>

          {/* Action buttons */}
          {!rescheduling ? (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleStartNow}
                className="px-4 py-2 text-[11px] font-bold tracking-[0.1em] uppercase bg-white text-[#080808] rounded hover:bg-[#e8e8e8] transition-all"
              >
                Start Now →
              </button>
              <button
                onClick={() => setRescheduling(true)}
                className="px-4 py-2 text-[11px] font-semibold tracking-[0.1em] uppercase border border-[#2a2a2a] text-[#888] rounded hover:border-[#333] hover:text-white transition-all"
              >
                Reschedule
              </button>
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-[11px] font-semibold tracking-[0.1em] uppercase border border-[#1f1f1f] text-[#444] rounded hover:border-[#2a2a2a] hover:text-[#888] transition-all"
              >
                Skip
              </button>
              <button
                onClick={() => setExpanded(!expanded)}
                className="px-4 py-2 text-[11px] font-semibold tracking-[0.1em] uppercase border border-[#1f1f1f] text-[#444] rounded hover:border-[#2a2a2a] hover:text-[#888] transition-all"
              >
                {expanded ? 'Less ↑' : `+${top.length - 1} More`}
              </button>
            </div>
          ) : (
            <div className="flex gap-2 items-center flex-wrap">
              <input
                type="date"
                className="bg-[#181818] border border-[#2a2a2a] rounded py-2 px-3 text-white text-[13px] font-light outline-none focus:border-[#333]"
                value={rescheduleDate}
                onChange={e => setRescheduleDate(e.target.value)}
              />
              <button
                onClick={handleReschedule}
                className="px-4 py-2 text-[11px] font-bold tracking-[0.1em] uppercase bg-white text-[#080808] rounded hover:bg-[#e8e8e8] transition-all"
              >
                Confirm
              </button>
              <button
                onClick={() => setRescheduling(false)}
                className="px-3 py-2 text-[11px] text-[#444] hover:text-[#888] transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {expanded && next.factors && <PriorityFactors factors={next.factors} />}
        </div>
      </div>

      {/* ── EXPANDED: TOP ACTIONS LIST ── */}
      {expanded && top.length > 1 && (
        <div className="mt-2 space-y-1.5 animate-fadeUp">
          <p className="text-[10px] tracking-[0.18em] uppercase text-[#444] font-medium px-1 mb-2">
            Queue
          </p>
          {top.slice(1).map((item) => {
            const u = getUrgency(item.score)
            const dl = item.task.due_date
              ? Math.ceil((new Date(item.task.due_date) - new Date()) / 86400000)
              : null
            return (
              <div
                key={item.task.id}
                className="bg-[#111] border border-[#1f1f1f] rounded-md px-4 py-3 flex items-center gap-3 hover:border-[#2a2a2a] transition-colors cursor-pointer"
                onClick={() => navigate('/projects')}
              >
                <span
                  className="text-[9px] font-bold tracking-[0.1em] uppercase px-2 py-0.5 rounded-sm border flex-shrink-0"
                  style={{
                    color:       u.color,
                    background:  `${u.color}18`,
                    borderColor: `${u.color}33`,
                  }}
                >
                  {u.label}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">{item.task.text}</p>
                  <p className="text-[10px] text-[#444] mt-0.5">{item.project.name}</p>
                </div>
                {dl !== null && (
                  <span
                    className="text-[10px] flex-shrink-0"
                    style={{ color: dl <= 0 ? '#ef4444' : dl <= 3 ? '#f59e0b' : '#444' }}
                  >
                    {dl <= 0 ? 'Overdue' : dl === 1 ? 'Tomorrow' : `${dl}d`}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}