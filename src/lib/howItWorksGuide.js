const VISIT_KEY = 'jos_how_it_works_visits'
const SESSION_VISIT_KEY = 'jos_how_it_works_visit_index'
const UI_KEY = 'jos_how_it_works_ui'
export const MAX_AUTO_SHOW_VISITS = 3

export function getHowItWorksVisitCount() {
  try {
    return parseInt(localStorage.getItem(VISIT_KEY) || '0', 10) || 0
  } catch {
    return 0
  }
}

export function shouldShowHowItWorksGuide() {
  return getHowItWorksVisitCount() < MAX_AUTO_SHOW_VISITS
}

/** Raw session value: null = never set this tab session. */
export function getHowItWorksUiStored() {
  try {
    return sessionStorage.getItem(UI_KEY)
  } catch {
    return null
  }
}

/** Visit index for this browser session (1–3), or 0 if guide is finished. */
export function getSessionHowItWorksVisitIndex() {
  try {
    const n = parseInt(sessionStorage.getItem(SESSION_VISIT_KEY) || '0', 10)
    return n >= 1 && n <= MAX_AUTO_SHOW_VISITS ? n : 0
  } catch {
    return 0
  }
}

/** Bump visit count once per browser session (max 3). Returns visit index 1–3, or 0 if done. */
export function recordHowItWorksVisit() {
  const existing = getSessionHowItWorksVisitIndex()
  if (existing) return existing

  const current = getHowItWorksVisitCount()
  if (current >= MAX_AUTO_SHOW_VISITS) return 0
  const next = current + 1
  try {
    localStorage.setItem(VISIT_KEY, String(next))
    sessionStorage.setItem(SESSION_VISIT_KEY, String(next))
  } catch { /* ignore */ }
  return next
}

export function getHowItWorksUiMode() {
  try {
    const v = sessionStorage.getItem(UI_KEY)
    if (v === 'minimized' || v === 'closed') return v
  } catch { /* ignore */ }
  return 'expanded'
}

export function setHowItWorksUiMode(mode) {
  try {
    sessionStorage.setItem(UI_KEY, mode)
  } catch { /* ignore */ }
}
