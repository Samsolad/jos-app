import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import useProjectStore from '../store/projectStore'
import useGoalStore from '../store/goalStore'
import useHabitStore from '../store/habitStore'
import useMentorStore from '../store/mentorStore'
import { getNextAction } from '../lib/scoring'
import useTaskStore from '../store/taskStore'

const IDLE_THRESHOLD_MS  = 20 * 60 * 1000  // 20 minutes
const IDLE_COOLDOWN_MS   = 30 * 60 * 1000  // 30 minutes between idle nudges
const EOD_HOURS          = [17, 19, 21]     // 5pm, 7pm, 9pm
const NO_ACTIVITY_HOURS  = [14, 16]         // 2pm, 4pm

export default function useMentorEngine() {
  const navigate   = useNavigate()
  const profile    = useAuthStore(s => s.profile)
  const { projects } = useProjectStore()
  const { goals }    = useGoalStore()
  const { habits, isLoggedToday } = useHabitStore()
  const { trigger }  = useMentorStore()
  const { tasks } = useTaskStore()

  const lastActivity   = useRef(Date.now())
  const lastIdleNudge  = useRef(0)
  const firedToday     = useRef(new Set())

  // Track user activity
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

      // ── IDLE NUDGE ───────────────────────────────────────────
      const idleMs   = Date.now() - lastActivity.current
      const idleMins = Math.floor(idleMs / 60000)
      const sinceLastNudge = Date.now() - lastIdleNudge.current

      if (idleMins >= 20 && sinceLastNudge > IDLE_COOLDOWN_MS) {
        lastIdleNudge.current = Date.now()

        // Use scoring engine to find actual next action
        const projectsWithTasks = projects.map(p => ({
          ...p,
          tasks: tasks[p.id] || [],
        }))
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

      // ── NO ACTIVITY ALL DAY ──────────────────────────────────
      if (NO_ACTIVITY_HOURS.includes(hour)) {
        const key = `no_activity_${dateKey}_${hour}`
        if (!fired.has(key)) {
          // Check if any tasks completed today (rough heuristic — tasks store)
          const hasActivity = projects.some(p =>
            (p.tasks || []).some(t => t.done)
          )
          if (!hasActivity && projects.length > 0) {
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
      }

      // ── END OF DAY ───────────────────────────────────────────
      if (EOD_HOURS.includes(hour)) {
        const key = `eod_${dateKey}_${hour}`
        if (!fired.has(key)) {
          fired.add(key)
          const allTasks  = projects.flatMap(p => p.tasks || [])
          const done      = allTasks.filter(t => t.done).length
          const pending   = allTasks.filter(t => !t.done).length
          await trigger(
            'eod',
            { done, pending },
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
          break // one at a time
        }
      }

      // ── HABITS REMINDER — 8pm if not all done ────────────────
      if (hour === 20) {
        const key = `habits_${dateKey}`
        if (!fired.has(key) && habits.length > 0) {
          const notDone = habits.filter(h => !isLoggedToday(h.id))
          if (notDone.length > 0) {
            fired.add(key)
            await trigger(
              'wise',
              {
                task: `${notDone.length} habit${notDone.length > 1 ? 's' : ''} not logged today: ${notDone.map(h => h.name).join(', ')}`
              },
              profile,
              [{ label: 'Log Habits', fn: () => navigate('/habits') }],
            )
          }
        }
      }

    }, 60000) // check every minute

    return () => clearInterval(interval)
  }, [profile, projects, goals, habits])
}