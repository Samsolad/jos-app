/** Decode Supabase JWT payload role without verifying signature (client-side sanity check). */
export function supabaseJwtRole(key) {
  if (!key || typeof key !== 'string') return null
  try {
    const payload = key.split('.')[1]
    if (!payload) return null
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = JSON.parse(atob(base64))
    return json.role ?? null
  } catch {
    return null
  }
}

export function getSupabaseConfigError(url, anonKey) {
  if (!url?.trim() || !anonKey?.trim()) {
    return 'Missing Supabase config. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local, then restart the dev server.'
  }

  const role = supabaseJwtRole(anonKey.trim())
  if (role === 'service_role') {
    return (
      'VITE_SUPABASE_ANON_KEY is set to the service_role secret. ' +
      'In Supabase → Settings → API, copy the anon public key instead. ' +
      'Never put service_role in any VITE_* variable.'
    )
  }
  if (role && role !== 'anon') {
    return `Supabase key has unexpected role "${role}". Use the anon public key from Settings → API.`
  }

  return null
}

/** Map Supabase auth/network errors to user-facing copy. */
export function formatSupabaseAuthError(err) {
  const msg = err?.message || String(err || '')
  const lower = msg.toLowerCase()

  if (lower.includes('secret api key') || lower.includes('forbidden use of secret')) {
    return (
      'Supabase secret key was used in the browser. In .env.local set VITE_SUPABASE_ANON_KEY ' +
      'to the anon public key (Settings → API), not service_role. Restart npm run dev.'
    )
  }
  if (msg.includes('Invalid login credentials')) {
    return 'Wrong email or password. If you just registered, confirm your email first, then sign in.'
  }
  if (msg.includes('Email not confirmed')) {
    return 'Confirm your email using the link from Supabase, then sign in.'
  }
  return msg || 'Sign-in failed.'
}
