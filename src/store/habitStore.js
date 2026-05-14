import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useHabitStore = create((set, get) => ({
  habits: [],
  logs: [],
  loading: false,

  fetchHabits: async () => {
    set({ loading: true })
    const { data: habits } = await supabase
      .from('habits')
      .select('*')
      .order('created_at', { ascending: true })

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

    const { data: logs } = await supabase
      .from('habit_logs')
      .select('*')
      .gte('logged_date', thirtyDaysAgo)

    set({ habits: habits || [], logs: logs || [], loading: false })
  },

  addHabit: async (name, frequency = 'daily') => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase
      .from('habits')
      .insert({ user_id: user.id, name, frequency })
      .select()
      .single()
    if (data) set(s => ({ habits: [...s.habits, data] }))
    return data
  },

  deleteHabit: async (id) => {
    await supabase.from('habits').delete().eq('id', id)
    set(s => ({ habits: s.habits.filter(h => h.id !== id) }))
  },

  toggleLog: async (habitId) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    const existing = get().logs.find(
      l => l.habit_id === habitId && l.logged_date === today
    )
    if (existing) {
      await supabase.from('habit_logs').delete().eq('id', existing.id)
      set(s => ({ logs: s.logs.filter(l => l.id !== existing.id) }))
    } else {
      const { data } = await supabase
        .from('habit_logs')
        .insert({ habit_id: habitId, user_id: user.id, logged_date: today })
        .select()
        .single()
      if (data) set(s => ({ logs: [...s.logs, data] }))
    }
  },

  isLoggedToday: (habitId) => {
    const today = new Date().toISOString().split('T')[0]
    return get().logs.some(l => l.habit_id === habitId && l.logged_date === today)
  },

  getStreak: (habitId) => {
    const logs = get().logs
      .filter(l => l.habit_id === habitId)
      .map(l => l.logged_date)
      .sort()
      .reverse()
    if (!logs.length) return 0
    let streak = 0
    const d = new Date()
    while (true) {
      const dateStr = d.toISOString().split('T')[0]
      if (logs.includes(dateStr)) {
        streak++
        d.setDate(d.getDate() - 1)
      } else break
    }
    return streak
  },
}))

export default useHabitStore