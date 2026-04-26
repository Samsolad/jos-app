import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const SESSION_KEY = 'jos_session_id'

function getLocalSession() {
  return localStorage.getItem(SESSION_KEY)
}

function setLocalSession(id) {
  localStorage.setItem(SESSION_KEY, id)
}

function clearLocalSession() {
  localStorage.removeItem(SESSION_KEY)
}

const useAuthStore = create((set, get) => ({
  user:    null,
  profile: null,
  loading: true,

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      const profile = await get().fetchProfile(session.user.id)

      // Session lock check
      const localId  = getLocalSession()
      const remoteId = profile?.session_id

      if (remoteId && localId && remoteId !== localId) {
        // Another device is logged in
        await supabase.auth.signOut()
        clearLocalSession()
        set({ user: null, profile: null, loading: false })
        window.location.href = '/login?reason=other_device'
        return
      }

      set({ user: session.user, profile, loading: false })
    } else {
      set({ loading: false })
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await get().fetchProfile(session.user.id)
        set({ user: session.user, profile })
      } else {
        set({ user: null, profile: null })
      }
    })
  },

  fetchProfile: async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return data
  },

  updateProfile: async (updates) => {
    const user = get().user
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    if (data) set({ profile: data })
    return data
  },

  register: async (name, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) throw error
    return data
  },

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error

    // Write new session ID — kicks out other devices
    const sessionId = crypto.randomUUID()
    setLocalSession(sessionId)

    if (data.user) {
      await supabase
        .from('profiles')
        .update({ session_id: sessionId })
        .eq('id', data.user.id)
    }

    return data
  },

  logout: async () => {
    clearLocalSession()
    const user = get().user
    if (user) {
      await supabase
        .from('profiles')
        .update({ session_id: null })
        .eq('id', user.id)
    }
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },
}))

export default useAuthStore