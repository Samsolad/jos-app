import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import useProjectStore from '../store/projectStore'
import useTaskStore from '../store/taskStore'
import useNavigatorStore from '../store/navigatorStore'
import {
  classifyIntent,
  decomposeGoal,
  pickProjectForTask,
  parseDueFromIntent,
} from '../lib/navigator'
import { applyTierToLowScoring } from '../lib/scoring'
import Button from './ui/Button'

export default function NavigatorInput() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const profile = useAuthStore((s) => s.profile)
  const { projects, fetchProjects } = useProjectStore()
  const { addTask, fetchAllTasks, updateTaskMeta } = useTaskStore()
  const { startReview, setError, setStatus, error } = useNavigatorStore()
  const navigate = useNavigate()

  const handleSubmit = async () => {
    const input = text.trim()
    if (!input || loading) return
    setLoading(true)
    setError(null)

    try {
      if (!projects.length) await fetchProjects()
      const list = useProjectStore.getState().projects
      const intent = await classifyIntent(input, list)

      if (intent.intent === 'task') {
        const project = pickProjectForTask(list, intent.revenue_project_hint)
        if (!project) {
          setError('Create a project first (Work tab), then try again.')
          setLoading(false)
          return
        }
        const due = parseDueFromIntent(intent.due_iso)
        await addTask(project.id, intent.task_text || input, due, {
          tier: 'active',
          is_paid: false,
        })
        await fetchAllTasks(list.map((p) => p.id))
        const tasksByProject = useTaskStore.getState().tasks
        const tierUpdates = applyTierToLowScoring(list, tasksByProject, 3)
        for (const u of tierUpdates) {
          await updateTaskMeta(u.projectId, u.taskId, { tier: u.tier })
        }
        setText('')
        navigate('/projects')
        setLoading(false)
        return
      }

      if (intent.intent === 'pivot') {
        const focus = pickProjectForTask(list, intent.revenue_project_hint || intent.goal_text)
        if (!focus) {
          setError('No project found for pivot. Name a project in your message.')
          setLoading(false)
          return
        }
        const crisis = intent.pivot_trigger || input
        await useTaskStore.getState().applyPivot(list, focus.id, crisis)
        await fetchAllTasks(list.map((p) => p.id))
        setText('')
        navigate('/projects')
        setLoading(false)
        return
      }

      setStatus('analysing')
      const proposal = await decomposeGoal(intent.goal_text || input, '', profile)
      if (!proposal) {
        setError('Could not decompose goal. Check AI / edge function.')
        setStatus('idle')
        setLoading(false)
        return
      }

      startReview({
        goalText: intent.goal_text || input,
        category: 'Career',
        proposal,
        populateProjectId: list[0]?.id || null,
      })
      setStatus('review')
      setText('')
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Navigator failed')
    }
    setLoading(false)
  }

  return (
    <div className="mb-6">
      <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium mb-2">
        Navigator — one field
      </p>
      <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-4">
        <p className="text-[12px] text-[#888] font-light mb-3">
          Task with deadline, new venture goal, or crisis pivot — J·OS routes it.
        </p>
        <textarea
          className="w-full bg-[#181818] border border-[#2a2a2a] rounded py-3 px-4 text-white text-[14px] font-light outline-none focus:border-[#333] placeholder:text-[#444] min-h-[88px] resize-y"
          placeholder='e.g. "Pay Aquagroove insurance by 4 PM today" or "Launch SoJona in 14 days" or "Aquagroove venue double-booked"'
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
        />
        {error && <p className="text-[#ef4444] text-xs mt-2">{error}</p>}
        <div className="flex gap-2 mt-3">
          <Button variant="solid" size="md" onClick={handleSubmit} disabled={loading || !text.trim()}>
            {loading ? (
              <span className="w-4 h-4 border-2 border-[#08080833] border-t-[#080808] rounded-full animate-spin" />
            ) : (
              'Run Navigator →'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

