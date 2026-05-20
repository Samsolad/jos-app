const SESSION_KEY = 'jos_session_id'

export function getLocalSessionId() {
  return localStorage.getItem(SESSION_KEY)
}

export function setLocalSessionId(id) {
  if (id) localStorage.setItem(SESSION_KEY, id)
  else localStorage.removeItem(SESSION_KEY)
}

export function createSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export function sessionMismatch(profile) {
  const local = getLocalSessionId()
  const remote = profile?.active_session_id
  if (!remote || !local) return false
  return remote !== local
}
