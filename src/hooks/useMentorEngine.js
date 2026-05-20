import { useEffect, useRef, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import useProjectStore from '../store/projectStore'
import useGoalStore from '../store/goalStore'
import useHabitStore from '../store/habitStore'
import useMentorStore from '../store/mentorStore'
import useRevenueStore from '../store/revenueStore'
import { getNextAction } from '../lib/scoring'
import useTaskStore from '../store/taskStore'
import { hadTaskActivityToday } from '../lib/activity'
import { canUseMentorTrigger, getLimits } from '../lib/subscription'

const IDLE_MINUTES       = 20
const IDLE_COOLDOWN_MS   = 30 * 60 * 1000
const EOD_HOURS          = [17, 19, 21]
const NO_ACTIVITY_HOURS  = [14, 16]
const MORNING_HOURS      = [6, 7, 8, 9, 10, 11]

function allTasksFlat(tasks) {
  return Object.values(tasks || {}).flat()
}

export default function useMentorEngine() {
  const navigate   = useNavigate()
  const profile    = useAuthStore(s => s.profile)
  const { projects } = useProjectStore()
  const { goals }    = useGoalStore()
  const { habits, isLoggedToday } = useHabitStore()
  const { entries, getTotals } = useRevenueStore()
  const { trigger }  = useMentorStore()
  const { tasks } = useTaskStore()

  const lastActivity   = useRef(null)
  const lastIdleNudge  = useRef(0)
  const firedToday     = useRef(new Set())

  useLayoutEffect(() => {
    lastActivity.current = Date.now()
  }, [])

  useEffect(() => {
    const reset = () => { lastActivity.current = Date.now() }
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    return () => events.forEach(e => window.removeEventListener(e, reset))
  }, [])

  useEffect(() => {
    if (!profile) return

    const interval = setInterval(async () => {
      const now     = new Date()
      const hour    = now.getHours()
      const dateKey = now.toDateString()
      const fired   = firedToday.current
      const limits  = getLimits(profile)

      const flatTasks = allTasksFlat(tasks)
      const projectsWithTasks = projects.map(p => ({
        ...p,
        tasks: tasks[p.id] || [],
      }))
      const doneToday = hadTaskActivityToday()
      const doneCount = flatTasks.filter(t => t.done).length
      const pendingCount = flatTasks.filter(t => !t.done).length

      // ── MORNING BRIEFING (6–11am, once) ───────────────────────
      if (MORNING_HOURS.includes(hour) && limits.morningBriefingVoice !== false) {
        const key = `morning_${dateKey}`
        if (!fired.has(key) && canUseMentorTrigger(profile, 'morning_briefing')) {
          fired.add(key)
          const activeGoals = goals.filter(g => !g.done).map(g => g.text).slice(0, 3).join('; ')
          await trigger(
            'morning_briefing',
            {
              projects: projects.map(p => p.name).join(', ') || 'none',
              goals: activeGoals || 'none',
              tasks: pendingCount,
            },
            profile,
            [{ label: 'Command Hub', fn: () => navigate('/') }],
          )
        }
      }

      // ── WEEKLY REVIEW (Monday) ────────────────────────────────
      if (now.getDay() === 1 && hour === 9 && limits.weeklyReview) {
        const key = `weekly_${dateKey}`
        if (!fired.has(key)) {
          fired.add(key)
          const { net } = getTotals(entries)
          await trigger(
            'weekly_review',
            {
              done: doneCount,
              pending: pendingCount,
              goals: goals.filter(g => !g.done).length,
              habits: habits.length,
              revenue: net,
            },
            profile,
            [{ label: 'Command Hub', fn: () => navigate('/') }],
          )
        }
      }

      // ── IDLE NUDGE ───────────────────────────────────────────
      if (canUseMentorTrigger(profile, 'idle')) {
        const idleMs   = Date.now() - (lastActivity.current ?? Date.now())
        const idleMins = Math.floor(idleMs / 60000)
        const sinceLastNudge = Date.now() - lastIdleNudge.current

        if (idleMins >= IDLE_MINUTES && sinceLastNudge > IDLE_COOLDOWN_MS) {
          lastIdleNudge.current = Date.now()
          const nextAction = getNextAction(projectsWithTasks)
          await trigger(
            'idle',
            {
              minutes: idleMins,
              task:    nextAction?.task?.text || null,
              project: nextAction?.project?.name || null,
            },
            profile,
            nextAction
              ? [{ label: 'Open Work', fn: () => navigate('/projects') }]
              : [],
          )
        }
      }

      // ── NO ACTIVITY ALL DAY ──────────────────────────────────
      if (NO_ACTIVITY_HOURS.includes(hour) && canUseMentorTrigger(profile, 'no_activity')) {
        const key = `no_activity_${dateKey}_${hour}`
        if (!fired.has(key) && !doneToday && projects.length > 0) {
          fired.add(key)
          await trigger(
            'no_activity',
            {
              projects: projects.map(p => p.name).join(', '),
              hour,
            },
            profile,
            [{ label: 'Open Work', fn: () => navigate('/projects') }],
          )
        }
      }

      // ── END OF DAY ───────────────────────────────────────────
      if (EOD_HOURS.includes(hour) && canUseMentorTrigger(profile, 'eod')) {
        const key = `eod_${dateKey}_${hour}`
        if (!fired.has(key)) {
          fired.add(key)
          await trigger(
            'eod',
            { done: doneToday ? 1 : 0, pending: pendingCount },
            profile,
          )
        }
      }

      // ── DEADLINE WARNINGS ────────────────────────────────────
      const urgentGoals = goals.filter(g => {
        if (g.done || !g.deadline) return false
        const days = Math.ceil((new Date(g.deadline) - now) / 86400000)
        return [7, 3, 1, 0].includes(days)
      })

      for (const g of urgentGoals) {
        const days = Math.ceil((new Date(g.deadline) - now) / 86400000)
        const key  = `deadline_${g.id}_${days}_${dateKey}`
        if (!fired.has(key)) {
          fired.add(key)
          await trigger(
            'deadline',
            { item: g.text, days },
            profile,
            [{ label: 'View Goal', fn: () => navigate('/goals') }],
          )
          break
        }
      }

      // ── HABITS REMINDER — 8pm ────────────────────────────────
      if (hour === 20 && canUseMentorTrigger(profile, 'wise')) {
        const key = `habits_${dateKey}`
        if (!fired.has(key) && habits.length > 0) {
          const notDone = habits.filter(h => !isLoggedToday(h.id))
          if (notDone.length > 0) {
            fired.add(key)
            await trigger(
              'wise',
              {
                task: `${notDone.length} habit${notDone.length > 1 ? 's' : ''} not logged: ${notDone.map(h => h.name).join(', ')}`,
              },
              profile,
              [{ label: 'Log Habits', fn: () => navigate('/habits') }],
            )
          }
        }
      }

    }, 60000)

    return () => clearInterval(interval)
  }, [profile, projects, goals, habits, tasks, entries])
}
