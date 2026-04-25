import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useFamilyStore = create((set) => ({
  contacts: [],
  loading: false,

  fetchContacts: async () => {
    set({ loading: true })
    const { data } = await supabase
      .from('family_contacts')
      .select('*')
      .order('created_at', { ascending: true })
    set({ contacts: data || [], loading: false })
  },

  addContact: async (description) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase
      .from('family_contacts')
      .insert({ user_id: user.id, description })
      .select()
      .single()
    if (data) set(s => ({ contacts: [...s.contacts, data] }))
    return data
  },

  logContact: async (id) => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('family_contacts')
      .update({ last_contact: today })
      .eq('id', id)
      .select()
      .single()
    if (data) set(s => ({
      contacts: s.contacts.map(c => c.id === id ? data : c)
    }))
  },

  deleteContact: async (id) => {
    await supabase.from('family_contacts').delete().eq('id', id)
    set(s => ({ contacts: s.contacts.filter(c => c.id !== id) }))
  },

  daysSince: (dateStr) => {
    if (!dateStr) return null
    return Math.floor((new Date() - new Date(dateStr)) / 86400000)
  },
}))

export default useFamilyStore