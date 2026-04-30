import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useInvestorStore = create((set, get) => ({
  investors: [],
  updates:   [],
  loading:   false,

  fetchInvestors: async () => {
    set({ loading: true })
    const { data: investors } = await supabase
      .from('investors')
      .select('*')
      .order('created_at', { ascending: false })
    const { data: updates } = await supabase
      .from('investor_updates')
      .select('*')
      .order('created_at', { ascending: false })
    set({ investors: investors || [], updates: updates || [], loading: false })
  },

  addInvestor: async (data) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: inv } = await supabase
      .from('investors')
      .insert({ ...data, user_id: user.id })
      .select()
      .single()
    if (inv) set(s => ({ investors: [inv, ...s.investors] }))
    return inv
  },

  updateInvestor: async (id, updates) => {
    const { data } = await supabase
      .from('investors')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (data) set(s => ({
      investors: s.investors.map(i => i.id === id ? data : i)
    }))
    return data
  },

  deleteInvestor: async (id) => {
    await supabase.from('investors').delete().eq('id', id)
    set(s => ({ investors: s.investors.filter(i => i.id !== id) }))
  },

  saveUpdate: async (investorId, subject, body) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase
      .from('investor_updates')
      .insert({ user_id: user.id, investor_id: investorId, subject, body, sent: false })
      .select()
      .single()
    if (data) {
      set(s => ({ updates: [data, ...s.updates] }))
      // Mark last_update_sent on investor
      await get().updateInvestor(investorId, {
        last_update_sent: new Date().toISOString().split('T')[0]
      })
    }
    return data
  },

  markSent: async (updateId) => {
    const { data } = await supabase
      .from('investor_updates')
      .update({ sent: true, sent_at: new Date().toISOString() })
      .eq('id', updateId)
      .select()
      .single()
    if (data) set(s => ({
      updates: s.updates.map(u => u.id === updateId ? data : u)
    }))
  },

  daysSinceUpdate: (investor) => {
    if (!investor.last_update_sent) return null
    return Math.floor((new Date() - new Date(investor.last_update_sent)) / 86400000)
  },
}))

export default useInvestorStore