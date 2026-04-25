import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useSocialStore = create((set, get) => ({
  posts: [],
  platforms: [],
  loading: false,

  fetchPosts: async () => {
    set({ loading: true })
    const { data: posts } = await supabase
      .from('social_posts')
      .select('*')
      .order('posted_at', { ascending: false })
      .limit(30)
    const { data: platforms } = await supabase
      .from('social_platforms')
      .select('*')
    set({ posts: posts || [], platforms: platforms || [], loading: false })
  },

  addPlatform: async (platform) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const existing = get().platforms.find(p => p.platform === platform)
    if (existing) return
    const { data } = await supabase
      .from('social_platforms')
      .insert({ user_id: user.id, platform })
      .select()
      .single()
    if (data) set(s => ({ platforms: [...s.platforms, data] }))
  },

  removePlatform: async (id) => {
    await supabase.from('social_platforms').delete().eq('id', id)
    set(s => ({ platforms: s.platforms.filter(p => p.id !== id) }))
  },

  savePost: async (platform, draft, posted = false) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase
      .from('social_posts')
      .insert({ user_id: user.id, platform, draft, posted })
      .select()
      .single()
    if (data) set(s => ({ posts: [data, ...s.posts] }))
    return data
  },

  markPosted: async (id) => {
    const { data } = await supabase
      .from('social_posts')
      .update({ posted: true, posted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (data) set(s => ({
      posts: s.posts.map(p => p.id === id ? data : p)
    }))
  },

  deletePost: async (id) => {
    await supabase.from('social_posts').delete().eq('id', id)
    set(s => ({ posts: s.posts.filter(p => p.id !== id) }))
  },

  getPostedToday: () => {
    const today = new Date().toISOString().split('T')[0]
    return get().posts
      .filter(p => p.posted && p.posted_at?.startsWith(today))
      .map(p => p.platform)
  },
}))

export default useSocialStore