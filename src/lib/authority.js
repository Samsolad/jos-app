/**
 * Progressive Authority — graduated AI autonomy by plan and user preference.
 */
import { getTier } from './subscription'

export const AUTH_LEVELS = {
  observe: 0,
  suggest: 1,
  preview: 2,
  execute: 3,
}

export const AUTH_LABELS = {
  observe: 'Observe',
  suggest: 'Suggest',
  preview: 'Preview & approve',
  execute: 'Execute',
}

/** Minimum authority level required per action */
export const ACTION_REQUIREMENTS = {
  navigator_task: 'suggest',
  navigator_auto_tier: 'preview',
  task_apply: 'preview',
  pivot: 'execute',
  tier_bulk_update: 'preview',
}

const TIER_DEFAULT_AUTHORITY = {
  free: 'suggest',
  personal: 'preview',
  operator: 'execute',
  team: 'execute',
}

export const TIER_MAX_AUTHORITY = { ...TIER_DEFAULT_AUTHORITY }

export function clampAuthorityLevel(level, tier) {
  const max = TIER_MAX_AUTHORITY[tier] || TIER_MAX_AUTHORITY.free
  if (AUTH_LEVELS[level] === undefined) return max
  return AUTH_LEVELS[level] <= AUTH_LEVELS[max] ? level : max
}

export function allowedAuthorityLevels(tier) {
  const max = TIER_MAX_AUTHORITY[tier] || TIER_MAX_AUTHORITY.free
  return Object.keys(AUTH_LABELS).filter((level) => AUTH_LEVELS[level] <= AUTH_LEVELS[max])
}

export function getAuthorityLevel(profile) {
  const custom = profile?.authority_level
  const tier = getTier(profile)
  if (custom && AUTH_LEVELS[custom] !== undefined) {
    return clampAuthorityLevel(custom, tier)
  }
  return TIER_DEFAULT_AUTHORITY[tier] || 'suggest'
}

export function canAutoApply(profile, action) {
  const level = getAuthorityLevel(profile)
  const required = ACTION_REQUIREMENTS[action] || 'preview'
  return AUTH_LEVELS[level] >= AUTH_LEVELS[required]
}

export function authorityDescription(profile) {
  const level = getAuthorityLevel(profile)
  const label = AUTH_LABELS[level] || level
  const tier = getTier(profile)

  const descriptions = {
    observe: 'AI only analyses — you apply every change manually.',
    suggest: 'AI proposes tasks and plans; you confirm before anything is saved.',
    preview: 'Routine task capture is automatic; bulk tier changes and pivots need your OK.',
    execute: 'Full autonomy — crisis pivots and tier enforcement run without extra prompts.',
  }

  return {
    level,
    label,
    tier,
    text: descriptions[level] || descriptions.suggest,
    canPivot: canAutoApply(profile, 'pivot'),
    canAutoTier: canAutoApply(profile, 'navigator_auto_tier'),
    canAutoTaskApply: canAutoApply(profile, 'task_apply'),
  }
}

export async function recordAuthorityAction(profile, action, accepted) {
  const stats = profile?.authority_stats && typeof profile.authority_stats === 'object'
    ? { ...profile.authority_stats }
    : { accepted: 0, rejected: 0, actions: [] }

  if (accepted) stats.accepted = (stats.accepted || 0) + 1
  else stats.rejected = (stats.rejected || 0) + 1

  const actions = Array.isArray(stats.actions) ? stats.actions : []
  actions.push({ action, accepted, at: new Date().toISOString() })
  stats.actions = actions.slice(-50)

  return stats
}
