import { create } from 'zustand'
import { generateDailyFocus } from '../lib/dailyFocus'
import { getLimits } from '../lib/subscription'

const CACHE_KEY = 'jos_daily_focus'
const CACHE_DATE_KEY = 'jos_daily_focus_date'

const useFocusStore = create((set, get) => ({
  focus:     null,
  loading:   false,
  error:     false,
  lastDate:  null,

  // Load focus — uses cache if already generated today
  loadFocus: async (profile, projects, goals, habits, entries, forceRefresh = false) => {
    if (!profile) return

    const today    = new Date().toDateString()
    const cached   = localStorage.getItem(CACHE_KEY)
    const cacheDate = localStorage.getItem(CACHE_DATE_KEY)

    // Use cache if same day and not forcing refresh
    if (!forceRefresh && cached && cacheDate === today) {
      try {
        const parsed = JSON.parse(cached)
        set({ focus: parsed, lastDate: today, loading: false })
        return
      } catch { /* fall through to regenerate */ }
    }

    set({ loading: true, error: false })

    try {
      const result = await generateDailyFocus(
        profile, projectsWithTasks, goals, habits, entries
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