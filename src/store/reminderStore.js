import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useReminderStore = create((set, get) => ({
  reminders: [],

  fetchReminders: async () => {
    const { data } = await supabase
      .from('profiles')
      .select('reminders')
      .single()
    set({ reminders: data?.reminders || [] })
  },

  addReminder: async (reminder) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      // Fetch current reminders
      const { data: profileData } = await supabase
        .from('profiles')
        .select('reminders')
        .eq('id', user.id)
        .single()

      const current = profileData?.reminders || []
      const updated = [...current, {
        id: crypto.randomUUID(),
        ...reminder,
        done: false,
        createdAt: new Date().toISOString(),
      }]

      await supabase
        .from('profiles')
        .update({ reminders: updated })
        .eq('id', user.id)

      set({ reminders: updated })
      return updated[updated.length - 1]
    } catch (err) {
      console.error('addReminder error:', err)
      return null
    }
  },

  toggleReminder: async (id) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const updated = get().reminders.map(r => r.id === id ? { ...r, done: !r.done } : r)
    await supabase.from('profiles').update({ reminders: updated }).eq('id', user.id)
    set({ reminders: updated })
  },

  deleteReminder: async (id) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const updated = get().reminders.filter(r => r.id !== id)
    await supabase.from('profiles').update({ reminders: updated }).eq('id', user.id)
    set({ reminders: updated })
  },

  getUpcoming: () => {
    const now = new Date()
    return get().reminders
      .filter(r => !r.done && r.datetime && new Date(r.datetime) > now)
      .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
  },

  getOverdue: () => {
    const now = new Date()
    return get().reminders
      .filter(r => !r.done && r.datetime && new Date(r.datetime) < now)
  },
}))

export default useReminderStore