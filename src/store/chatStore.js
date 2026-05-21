import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const CHAT_HISTORY_KEY = 'jos_chat_history'
const MAX_MESSAGES = 40

const useChatStore = create((set, get) => ({
  messages: [],
  sessionId: 'default',
  loaded: false,
  useLocalOnly: false,

  loadMessages: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      get().loadFromLocal()
      return
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .select('role, content, metadata, created_at')
      .eq('session_id', get().sessionId)
      .order('created_at', { ascending: true })
      .limit(MAX_MESSAGES)

    if (error?.message?.includes('does not exist') || error?.code === '42P01') {
      get().loadFromLocal()
      set({ useLocalOnly: true })
      return
    }

    if (error || !data?.length) {
      get().loadFromLocal()
      if (!error) set({ loaded: true })
      return
    }

    const messages = data.map((m) => ({
      role: m.role,
      content: m.content,
      confidence: m.metadata?.confidence,
    }))
    set({ messages, loaded: true, useLocalOnly: false })
  },

  loadFromLocal: () => {
    try {
      const saved = localStorage.getItem(CHAT_HISTORY_KEY)
      if (saved) {
        set({ messages: JSON.parse(saved).slice(-MAX_MESSAGES), loaded: true })
        return
      }
    } catch { /* ignore */ }
    set({ loaded: true })
  },

  persistMessages: async (messages) => {
    const trimmed = messages.slice(-MAX_MESSAGES)
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(trimmed))
    } catch { /* ignore */ }

    if (get().useLocalOnly) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || trimmed.length === 0) return

    const last = trimmed[trimmed.length - 1]
    const { error } = await supabase.from('chat_messages').insert({
      user_id: user.id,
      session_id: get().sessionId,
      role: last.role,
      content: last.content,
      metadata: { confidence: last.confidence },
    })

    if (error) {
      console.warn('[chat] persist failed, using local only:', error.message)
      set({ useLocalOnly: true })
    }
  },

  setMessages: (messages) => {
    set({ messages: messages.slice(-MAX_MESSAGES) })
  },

  appendMessage: async (msg) => {
    const next = [...get().messages, msg].slice(-MAX_MESSAGES)
    set({ messages: next })
    await get().persistMessages(next)
  },

  clearMessages: async () => {
    set({ messages: [] })
    localStorage.removeItem(CHAT_HISTORY_KEY)
    const { data: { user } } = await supabase.auth.getUser()
    if (user && !get().useLocalOnly) {
      await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', user.id)
        .eq('session_id', get().sessionId)
    }
  },
}))

export default useChatStore
