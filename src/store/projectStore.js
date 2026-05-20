import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import useAuthStore from './authStore'
import { getLimits, isAtLimit } from '../lib/subscription'

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
    const profile = useAuthStore.getState().profile
    const limits = getLimits(profile)
    const count = get().projects.length
    if (isAtLimit(count, limits.projects)) {
      throw new Error(`Free plan allows up to ${limits.projects} projects. Upgrade to Personal for unlimited.`)
    }
    const { data } = await supabase
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

  updateProjectMeta: async (id, metaPatch) => {
    const project = get().projects.find((p) => p.id === id)
    if (!project) return null
    const meta = {
      ...(project.meta && typeof project.meta === 'object' ? project.meta : {}),
      ...metaPatch,
    }
    return get().updateProject(id, { meta })
  },

  deleteProject: async (id) => {
    await supabase.from('projects').delete().eq('id', id)
    set(s => ({ projects: s.projects.filter(p => p.id !== id) }))
  },
}))

export default useProjectStore