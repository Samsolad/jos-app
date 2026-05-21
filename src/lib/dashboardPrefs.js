/** Which Command Hub sections to show — built from onboarding preferences. */

const DEFAULT_SECTIONS = {
  focus: true,
  reminders: true,
  navigator: true,
  nextAction: true,
  projects: true,
  goals: true,
  habits: true,
  revenue: true,
  family: false,
  investors: false,
  social: false,
}

export function parsePreferences(profile) {
  const p = profile?.preferences
  if (!p) return { ...DEFAULT_SECTIONS, ...(profile?.onboarding_completed ? {} : {}) }
  if (typeof p === 'string') {
    try { return { ...DEFAULT_SECTIONS, ...JSON.parse(p) } }
    catch { return { ...DEFAULT_SECTIONS } }
  }
  return { ...DEFAULT_SECTIONS, ...p }
}

export function sectionsFromOnboarding(answers) {
  const a = answers || {}
  const hasProjects = (a.projects || []).length > 0 || a.focusAreas?.includes('projects')
  const hasGoals = (a.goals || []).length > 0 || a.focusAreas?.includes('goals')
  const hasHabits = (a.habits || []).length > 0 || a.focusAreas?.includes('habits')
  const hasRevenue = a.focusAreas?.includes('revenue') || a.trackMoney
  const hasFamily = (a.familyContacts || []).length > 0 || a.focusAreas?.includes('family')
  const hasSocial = (a.socialPlatforms || []).length > 0 || a.focusAreas?.includes('social')
  const hasInvestors = a.focusAreas?.includes('investors')

  return {
    focus: true,
    reminders: true,
    navigator: true,
    nextAction: hasProjects,
    projects: hasProjects,
    goals: hasGoals,
    habits: hasHabits,
    revenue: hasRevenue,
    family: hasFamily,
    investors: hasInvestors,
    social: hasSocial,
  }
}

export function getDashboardSections(profile) {
  const prefs = parsePreferences(profile)
  if (prefs.sections) return { ...DEFAULT_SECTIONS, ...prefs.sections }
  return prefs
}

export function isOnboardingComplete(profile) {
  if (profile?.onboarding_completed === true) return true
  try {
    if (profile?.id && localStorage.getItem('jos_onboarding_complete') === profile.id) {
      return true
    }
    const p = typeof profile?.preferences === 'string'
      ? JSON.parse(profile.preferences)
      : profile?.preferences
    if (p?.completedAt || p?.onboarding?.completedAt) return true
  } catch { /* ignore */ }
  // Legacy accounts that set up profile before the wizard existed
  if (profile?.role && profile?.about) return true
  return false
}
