import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useProjectStore = create((set, get) => ({
  projects: [],
  loading: false,

  fetchProjects: async () => {
    set({ loading: true })
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    set({ projects: data || [], loading: false })
  },

  addProject: async (name, status = 'Active', notes = '') => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase
      .from('projects')
      .insert({ user_id: user.id, name, status, notes })
      .select()
      .single()
    if (data) set(s => ({ projects: [data, ...s.projects] }))
    return data
  },

  updateProject: async (id, updates) => {
    const { data } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (data) set(s => ({
      projects: s.projects.map(p => p.id === id ? data : p)
    }))
    return data
  },

  deleteProject: async (id) => {
    await supabase.from('projects').delete().eq('id', id)
    set(s => ({ projects: s.projects.filter(p => p.id !== id) }))
  },
}))

export default useProjectStore