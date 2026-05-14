import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useProjectStore  from '../store/projectStore'
import useGoalStore     from '../store/goalStore'
import useHabitStore    from '../store/habitStore'
import useRevenueStore  from '../store/revenueStore'
import useReminderStore from '../store/reminderStore'
import { supabase }     from '../lib/supabase'

export default function useAppFocus() {
  const navigate = useNavigate()
  const { fetchProjects }  = useProjectStore()
  const { fetchGoals }     = useGoalStore()
  const { fetchHabits }    = useHabitStore()
  const { fetchEntries }   = useRevenueStore()
  const { fetchReminders } = useReminderStore()
  useEffect(() => {
    let hiddenAt = null

    const handleVisibility = async () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
        return
      }

      // App came back into view
      if (document.visibilityState === 'visible') {
        const awayMs = hiddenAt ? Date.now() - hiddenAt : 0
        hiddenAt = null

        // Less than 2 minutes — do nothing
        if (awayMs < 2 * 60 * 1000) return

        try {
          // Check if session is still valid
          const { data: { session } } = await supabase.auth.getSession()

          if (!session) {
            // Session gone — redirect to login
            navigate('/login')
            return
          }

          // Refresh all stores silently
          await Promise.all([
            fetchProjects(),
            fetchGoals(),
            fetchHabits(),
            fetchEntries(),
            fetchReminders(),
          ])
        } catch (err) {
          console.warn('App focus refresh error:', err)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleVisibility)
    window.addEventListener('pageshow', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleVisibility)
      window.removeEventListener('pageshow', handleVisibility)
    }
  }, [])
}