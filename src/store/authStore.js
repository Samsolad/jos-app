import { create } from 'zustand'
import { supabase, isSupabaseConfigured, supabaseConfigError } from '../lib/supabase'
import { formatSupabaseAuthError } from '../lib/supabaseKey'
import {
  createSessionId,
  getLocalSessionId,
  setLocalSessionId,
  sessionMismatch,
} from '../lib/session'

async function ensureProfileRow(user, nameHint) {
  const name =
    nameHint ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'User'
  const { data: created, error: insertErr } = await supabase
    .from('profiles')
    .insert({ id: user.id, name })
    .select()
    .single()
  if (!insertErr && created) return created
  if (insertErr) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) return data
    console.warn('[auth] Could not create or load profile:', insertErr.message)
  }
  return null
}

const useAuthStore = create((set, get) => ({
  user:    null,
  profile: null,
  loading: true,
  _unsubscribeAuth: null,

  claimSession: async (userId) => {
    const sessionId = createSessionId()
    setLocalSessionId(sessionId)
    const { data } = await supabase
      .from('profiles')
      .update({ active_session_id: sessionId })
      .eq('id', userId)
      .select()
      .single()
    if (data) set({ profile: data })
    return sessionId
  },

  checkSessionLock: async () => {
    const user = get().user
    if (!user) return true
    const profile = await get().fetchProfile(user.id)
    if (!profile) return true
    if (sessionMismatch(profile)) {
      setLocalSessionId(null)
      await supabase.auth.signOut()
      set({ user: null, profile: null })
      return false
    }
    set({ profile })
    return true
  },

  init: async () => {
    get()._unsubscribeAuth?.()

    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      let profile = await get().fetchProfile(session.user.id)
      if (!profile) profile = await ensureProfileRow(session.user)

      if (profile && sessionMismatch(profile)) {
        setLocalSessionId(null)
        await supabase.auth.signOut()
        set({ user: null, profile: null, loading: false })
      } else if (!getLocalSessionId() && profile?.active_session_id) {
        setLocalSessionId(profile.active_session_id)
        set({ user: session.user, profile, loading: false })
      } else if (!profile?.active_session_id) {
        await get().claimSession(session.user.id)
        set({ user: session.user, profile: get().profile || profile, loading: false })
      } else {
        set({ user: session.user, profile, loading: false })
      }
    } else {
      set({ loading: false })
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        let profile = await get().fetchProfile(session.user.id)
        if (!profile) profile = await ensureProfileRow(session.user)
        if (profile && sessionMismatch(profile)) {
          setLocalSessionId(null)
          await supabase.auth.signOut()
          set({ user: null, profile: null })
          return
        }
        set({ user: session.user, profile })
      } else {
        set({ user: null, profile: null })
        setLocalSessionId(null)
      }
    })

    set({ _unsubscribeAuth: () => subscription.unsubscribe() })
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
    if (!isSupabaseConfigured()) {
      throw new Error(supabaseConfigError || 'App is missing Supabase configuration.')
    }
    const trimmedEmail = email.trim()
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: { data: { name: name.trim() } },
    })
    if (error) {
      const wrapped = new Error(formatSupabaseAuthError(error))
      wrapped.cause = error
      throw wrapped
    }
    if (!data.user) throw new Error('Registration did not return a user. Check your Supabase Auth settings.')

    if (!data.session) {
      const err = new Error(
        'Account created. Check your email and open the confirmation link, then sign in here.',
      )
      err.code = 'EMAIL_CONFIRMATION_REQUIRED'
      throw err
    }

    let profile = await get().fetchProfile(data.user.id)
    if (!profile) profile = await ensureProfileRow(data.user, name.trim())
    set({ user: data.user, profile })
    await get().claimSession(data.user.id)
    return data
  },

  completeOnboarding: async (updates) => {
    const user = get().user
    if (!user) return null
    const payload = { ...updates, onboarding_completed: true }
    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id)
      .select()
      .single()
    if (error?.message?.includes('onboarding_completed') || error?.message?.includes('preferences')) {
      const fallback = { ...updates }
      delete fallback.onboarding_completed
      delete fallback.preferences
      const res = await supabase.from('profiles').update(fallback).eq('id', user.id).select().single()
      if (res.data) {
        const merged = {
          ...res.data,
          onboarding_completed: true,
          preferences: updates.preferences,
        }
        set({ profile: merged })
        return merged
      }
    }
    if (data) set({ profile: data })
    return data
  },

  login: async (email, password) => {
    if (!isSupabaseConfigured()) {
      throw new Error(supabaseConfigError || 'App is missing Supabase configuration.')
    }
    const trimmedEmail = email.trim()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    })
    if (error) {
      const wrapped = new Error(formatSupabaseAuthError(error))
      wrapped.cause = error
      throw wrapped
    }
    if (!data.user) {
      throw new Error('Sign-in did not return a user. Check Supabase Auth and try again.')
    }

    let profile = await get().fetchProfile(data.user.id)
    if (!profile) profile = await ensureProfileRow(data.user)
    set({ user: data.user, profile })
    await get().claimSession(data.user.id)
    return data
  },

  logout: async () => {
    setLocalSessionId(null)
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },

  requestPasswordReset: async (email) => {
    if (!isSupabaseConfigured()) {
      throw new Error(supabaseConfigError || 'App is missing Supabase configuration.')
    }
    const trimmedEmail = email.trim()
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      const wrapped = new Error(formatSupabaseAuthError(error))
      wrapped.cause = error
      throw wrapped
    }
  },

  updatePassword: async (password) => {
    if (!isSupabaseConfigured()) {
      throw new Error(supabaseConfigError || 'App is missing Supabase configuration.')
    }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      const wrapped = new Error(formatSupabaseAuthError(error))
      wrapped.cause = error
      throw wrapped
    }
  },
}))

export default useAuthStore