/** Freemium tier limits — enforced client-side until Stripe (Phase 5). */

export const TIERS = {
  free: 'free',
  personal: 'personal',
  operator: 'operator',
  team: 'team',
}

export const LIMITS = {
  free: {
    projects: 3,
    goals: 2,
    habits: 3,
    chatMessagesPerDay: 10,
    socialPlatforms: 1,
    familyContacts: 3,
    reminders: 5,
    investors: 0,
    mentorTriggers: ['next_task'],
    dailyFocus: false,
    weeklyReview: false,
    morningBriefingVoice: true,
    integrations: false,
    teamFeatures: false,
  },
  personal: {
    projects: Infinity,
    goals: Infinity,
    habits: Infinity,
    chatMessagesPerDay: 100,
    socialPlatforms: Infinity,
    familyContacts: Infinity,
    reminders: Infinity,
    investors: 3,
    mentorTriggers: 'all',
    dailyFocus: true,
    weeklyReview: true,
    morningBriefingVoice: true,
    integrations: true,
    teamFeatures: false,
  },
  operator: {
    projects: Infinity,
    goals: Infinity,
    habits: Infinity,
    chatMessagesPerDay: Infinity,
    socialPlatforms: Infinity,
    familyContacts: Infinity,
    reminders: Infinity,
    investors: Infinity,
    mentorTriggers: 'all',
    dailyFocus: true,
    weeklyReview: true,
    morningBriefingVoice: true,
    integrations: true,
    teamFeatures: false,
  },
  team: {
    projects: Infinity,
    goals: Infinity,
    habits: Infinity,
    chatMessagesPerDay: Infinity,
    socialPlatforms: Infinity,
    familyContacts: Infinity,
    reminders: Infinity,
    investors: Infinity,
    mentorTriggers: 'all',
    dailyFocus: true,
    weeklyReview: true,
    morningBriefingVoice: true,
    integrations: true,
    teamFeatures: true,
  },
}

export function getTier(profile) {
  const t = profile?.subscription_tier || TIERS.free
  return LIMITS[t] ? t : TIERS.free
}

export function getLimits(profile) {
  return LIMITS[getTier(profile)] || LIMITS.free
}

export function canUseMentorTrigger(profile, trigger) {
  const limits = getLimits(profile)
  if (limits.mentorTriggers === 'all') return true
  return limits.mentorTriggers.includes(trigger)
}

export function isAtLimit(count, limit) {
  if (!Number.isFinite(limit)) return false
  return count >= limit
}

const CHAT_USAGE_KEY = 'jos_chat_usage'

export function getChatUsageToday() {
  try {
    const raw = localStorage.getItem(CHAT_USAGE_KEY)
    if (!raw) return { date: '', count: 0 }
    return JSON.parse(raw)
  } catch {
    return { date: '', count: 0 }
  }
}

export function incrementChatUsage() {
  const today = new Date().toDateString()
  const cur = getChatUsageToday()
  const count = cur.date === today ? cur.count + 1 : 1
  localStorage.setItem(CHAT_USAGE_KEY, JSON.stringify({ date: today, count }))
  return count
}

export function chatMessagesRemaining(profile) {
  const limits = getLimits(profile)
  const today = new Date().toDateString()
  const cur = getChatUsageToday()
  const used = cur.date === today ? cur.count : 0
  const max = limits.chatMessagesPerDay
  if (!Number.isFinite(max)) return Infinity
  return Math.max(0, max - used)
}

export function tierLabel(tier) {
  if (tier === 'personal') return 'Personal'
  if (tier === 'operator') return 'Operator'
  if (tier === 'team') return 'Team'
  return 'Free'
}

export function canUseIntegrations(profile) {
  const limits = getLimits(profile)
  return limits.integrations !== false
}
