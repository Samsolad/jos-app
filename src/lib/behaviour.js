/**
 * Behaviour Engine — tracks user patterns and feeds the priority engine.
 */
import { supabase } from './supabase'

const LOCAL_KEY = 'jos_behaviour_events'
const LOCAL_SIGNALS = 'jos_behaviour_signals'
const MAX_LOCAL = 200

export const EVENT_TYPES = {
  TASK_COMPLETED: 'task_completed',
  TASK_SKIPPED: 'task_skipped',
  TASK_RESCHEDULED: 'task_rescheduled',
  NAVIGATOR_RUN: 'navigator_run',
  CHAT_SENT: 'chat_sent',
  FOCUS_REFRESHED: 'focus_refreshed',
  MENTOR_DISMISSED: 'mentor_dismissed',
  AI_SUGGESTION_ACCEPTED: 'ai_suggestion_accepted',
}

function readLocalEvents() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeLocalEvents(events) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(events.slice(-MAX_LOCAL)))
}

function readSignals() {
  try {
    const raw = localStorage.getItem(LOCAL_SIGNALS)
    return raw ? JSON.parse(raw) : { skips: {}, completions: {}, lastActive: null }
  } catch {
    return { skips: {}, completions: {}, lastActive: null }
  }
}

function writeSignals(signals) {
  localStorage.setItem(LOCAL_SIGNALS, JSON.stringify(signals))
}

function updateSignals(eventType, payload = {}) {
  const signals = readSignals()
  const today = new Date().toDateString()
  signals.lastActive = today

  const taskId = payload.taskId || payload.task_id
  if (eventType === EVENT_TYPES.TASK_SKIPPED && taskId) {
    signals.skips[taskId] = (signals.skips[taskId] || 0) + 1
  }
  if (eventType === EVENT_TYPES.TASK_COMPLETED && taskId) {
    signals.completions[taskId] = (signals.completions[taskId] || 0) + 1
    delete signals.skips[taskId]
  }

  writeSignals(signals)
  return signals
}

/** Returns -20..+20 adjustment for priority behaviour factor */
export function getBehaviourBoost(taskId) {
  const signals = readSignals()
  if (!taskId) return 0
  const skips = signals.skips[taskId] || 0
  const completions = signals.completions[taskId] || 0
  let boost = 0
  if (completions > 0) boost += Math.min(15, completions * 5)
  if (skips > 0) boost -= Math.min(20, skips * 8)
  if (signals.lastActive === new Date().toDateString()) boost += 5
  return boost
}

export function getBehaviourSummary() {
  const signals = readSignals()
  const skipCount = Object.values(signals.skips).reduce((a, b) => a + b, 0)
  const completionCount = Object.values(signals.completions).reduce((a, b) => a + b, 0)
  return {
    skipCount,
    completionCount,
    activeToday: signals.lastActive === new Date().toDateString(),
    avoidedTasks: Object.entries(signals.skips)
      .filter(([, n]) => n >= 2)
      .map(([id]) => id),
  }
}

export async function trackEvent(eventType, payload = {}) {
  updateSignals(eventType, payload)

  const events = readLocalEvents()
  const entry = {
    event_type: eventType,
    entity_type: payload.entityType || null,
    entity_id: payload.entityId || payload.taskId || null,
    payload,
    created_at: new Date().toISOString(),
  }
  events.push(entry)
  writeLocalEvents(events)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return entry

  supabase
    .from('behaviour_events')
    .insert({
      user_id: user.id,
      event_type: eventType,
      entity_type: payload.entityType || null,
      entity_id: payload.entityId || payload.taskId || null,
      payload,
    })
    .then(({ error }) => {
      if (error && !error.message?.includes('does not exist')) {
        console.warn('[behaviour]', error.message)
      }
    })

  return entry
}
