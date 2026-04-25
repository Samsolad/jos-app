import { useEffect } from 'react'
import useProjectStore from '../store/projectStore'
import useGoalStore from '../store/goalStore'
import useHabitStore from '../store/habitStore'
import useRevenueStore from '../store/revenueStore'
import useReminderStore from '../store/reminderStore'
import useAuthStore from '../store/authStore'
import { supabase } from '../lib/supabase'

export default function useAppFocus() {
  const { fetchProjects } = useProjectStore()
  const { fetchGoals }    = useGoalStore()
  const { fetchHabits }   = useHabitStore()
  const { fetchEntries }  = useRevenueStore()
  const { fetchReminders }= useReminderStore()
  const { init }          = useAuthStore()

  useEffect(() => {
    let lastActive = Date.now()

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const awayMs = Date.now() - lastActive

        // If away for more than 5 minutes — refresh everything
        if (awayMs > 5 * 60 * 1000) {
          // Re-check auth session first
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            // Session expired — re-init will redirect to login
            await init()
            return
          }

          // Refresh all data silently
          fetchProjects()
          fetchGoals()
          fetchHabits()
          fetchEntries()
          fetchReminders()
        }

        lastActive = Date.now()
      } else {
        lastActive = Date.now()
      }
    }

    const handleFocus = () => {
      handleVisibilityChange()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])
}