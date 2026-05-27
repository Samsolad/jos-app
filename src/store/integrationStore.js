import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import {
  fetchIntegrationStatus,
  getGoogleAuthUrl,
  exchangeGoogleCode,
  disconnectProvider,
  invokeIntegration,
  OAUTH_STATE_KEY,
  saveSocialToken as saveSocialTokenApi,
} from '../lib/integrations'
import { listRecentEmails, extractCommitmentsFromEmails, saveInboxItems } from '../lib/gmail'
import { listCalendarEvents, autoBlockTopTask } from '../lib/calendar'
import { extractFromWhatsAppPaste } from '../lib/whatsapp'

const useIntegrationStore = create((set, get) => ({
  status: {},
  inbox: [],
  calendarEvents: [],
  emails: [],
  loading: false,
  error: null,

  loadStatus: async () => {
    try {
      const status = await fetchIntegrationStatus()
      set({ status, error: null })
      return status
    } catch (err) {
      set({ error: err.message })
      return {}
    }
  },

  connectGoogle: async () => {
    const { url } = await getGoogleAuthUrl()
    if (url) window.location.href = url
  },

  finishGoogleOAuth: async (code, state) => {
    set({ loading: true, error: null })
    try {
      await exchangeGoogleCode(code, state)
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(OAUTH_STATE_KEY)
      }
      await get().loadStatus()
    } catch (err) {
      set({ error: err.message })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  disconnect: async (provider) => {
    await disconnectProvider(provider)
    await get().loadStatus()
  },

  fetchInbox: async () => {
    const { data } = await supabase
      .from('integration_inbox')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50)
    set({ inbox: data || [] })
  },

  dismissInboxItem: async (id) => {
    await supabase.from('integration_inbox').update({ status: 'dismissed' }).eq('id', id)
    set((s) => ({ inbox: s.inbox.filter((i) => i.id !== id) }))
  },

  applyInboxItem: async (id) => {
    await supabase.from('integration_inbox').update({ status: 'applied' }).eq('id', id)
    set((s) => ({ inbox: s.inbox.filter((i) => i.id !== id) }))
  },

  syncGmailInbox: async () => {
    set({ loading: true, error: null })
    try {
      const messages = await listRecentEmails()
      set({ emails: messages })
      const items = await extractCommitmentsFromEmails(messages)
      await saveInboxItems('gmail', items, { message_count: messages.length })
      await get().fetchInbox()
    } catch (err) {
      set({ error: err.message })
    } finally {
      set({ loading: false })
    }
  },

  syncCalendar: async () => {
    set({ loading: true, error: null })
    try {
      const events = await listCalendarEvents()
      set({ calendarEvents: events, error: null })
    } catch (err) {
      set({ error: err.message })
    } finally {
      set({ loading: false })
    }
  },

  blockTopPriority: async (projects, tasksByProject, goals) => {
    set({ loading: true, error: null })
    try {
      const result = await autoBlockTopTask(projects, tasksByProject, goals)
      await get().syncCalendar()
      return result
    } catch (err) {
      set({ error: err.message })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  importWhatsApp: async (text) => {
    set({ loading: true, error: null })
    try {
      await extractFromWhatsAppPaste(text)
      await get().fetchInbox()
    } catch (err) {
      set({ error: err.message })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  saveSocialToken: async (platform, token) => {
    await saveSocialTokenApi(platform, token)
    await get().loadStatus()
  },

  queueSocialPost: async (platform, draft) => {
    return invokeIntegration({ action: 'social_queue', platform, draft })
  },
}))

export default useIntegrationStore
