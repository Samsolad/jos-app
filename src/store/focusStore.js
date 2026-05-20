import { create } from 'zustand'
import { generateDailyFocus } from '../lib/dailyFocus'
import { getLimits } from '../lib/subscription'
import { getTopActions } from '../lib/priorityEngine'

const CACHE_KEY = 'jos_daily_focus'
const CACHE_DATE_KEY = 'jos_daily_focus_date'

function buildProjectsWithTasks(projects, tasksByProject) {
  return projects.map((p) => ({
    ...p,
    tasks: tasksByProject?.[p.id] || p.tasks || [],
  }))
}

const useFocusStore = create((set, get) => ({
  focus: null,
  loading: false,
  error: false,
  lastDate: null,

  loadFocus: async (
    profile,
    projects,
    goals,
    habits,
    entries,
    forceRefresh = false,
    tasksByProject = {},
  ) => {
    if (!profile) return

    const limits = getLimits(profile)
    if (!limits.dailyFocus) return

    const today = new Date().toDateString()
    const cached = localStorage.getItem(CACHE_KEY)
    const cacheDate = localStorage.getItem(CACHE_DATE_KEY)

    if (!forceRefresh && cached && cacheDate === today) {
      try {
        const parsed = JSON.parse(cached)
        set({ focus: parsed, lastDate: today, loading: false })
        return
      } catch { /* regenerate */ }
    }

    set({ loading: true, error: false })

    try {
      const projectsWithTasks = buildProjectsWithTasks(projects, tasksByProject)
      const priorityHint = getTopActions(projects, tasksByProject, 5, { goals })

      const result = await generateDailyFocus(
        profile,
        projectsWithTasks,
        goals,
        habits,
        entries,
        priorityHint,
      )

      if (result && result.focus) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(result))
        localStorage.setItem(CACHE_DATE_KEY, today)
        set({ focus: result, lastDate: today, loading: false })
      } else {
        set({ loading: false, error: true })
      }
    } catch {
      set({ loading: false, error: true })
    }
  },

  refresh: async (profile, projects, goals, habits, entries, tasksByProject) => {
    await get().loadFocus(profile, projects, goals, habits, entries, true, tasksByProject)
  },

  clear: () => {
    localStorage.removeItem(CACHE_KEY)
    localStorage.removeItem(CACHE_DATE_KEY)
    set({ focus: null, lastDate: null })
  },
}))

export default useFocusStore
