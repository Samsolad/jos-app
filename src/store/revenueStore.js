import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useRevenueStore = create((set) => ({
  entries: [],
  loading: false,

  fetchEntries: async () => {
    set({ loading: true })
    const { data } = await supabase
      .from('revenue')
      .select('*')
      .order('created_at', { ascending: false })
    set({ entries: data || [], loading: false })
  },

  addEntry: async (source, amount, type) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase
      .from('revenue')
      .insert({ user_id: user.id, source, amount: Number(amount), type })
      .select()
      .single()
    if (data) set(s => ({ entries: [data, ...s.entries] }))
    return data
  },

  deleteEntry: async (id) => {
    await supabase.from('revenue').delete().eq('id', id)
    set(s => ({ entries: s.entries.filter(e => e.id !== id) }))
  },

  getTotals: (entries) => {
    const inn = entries.filter(e => e.type === 'in').reduce((s, e) => s + Number(e.amount), 0)
    const out = entries.filter(e => e.type === 'out').reduce((s, e) => s + Number(e.amount), 0)
    return { inn, out, net: inn - out }
  },
}))

export default useRevenueStore