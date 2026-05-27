/**
 * Phase 3 — Integration providers and edge-function bridge.
 */
import { supabase } from './supabase'

export const PROVIDERS = {
  google: {
    id: 'google',
    label: 'Google',
    description: 'Gmail read/send + Calendar sync',
    icon: 'G',
    scopes: 'Gmail & Calendar',
  },
  linkedin: {
    id: 'linkedin',
    label: 'LinkedIn',
    description: 'Queue posts for approval (connect token)',
    icon: 'in',
    scopes: 'w_member_social',
  },
  facebook: {
    id: 'facebook',
    label: 'Facebook',
    description: 'Page posts via connected account',
    icon: 'f',
    scopes: 'pages_manage_posts',
  },
  whatsapp: {
    id: 'whatsapp',
    label: 'WhatsApp',
    description: 'Paste threads — AI extracts action items',
    icon: 'W',
    manual: true,
  },
}

export async function invokeIntegration(body) {
  const { data, error } = await supabase.functions.invoke('integrations', { body })
  if (error) throw new Error(error.message || 'Integration request failed')
  if (data?.error) {
    const err = new Error(data.message || data.error)
    err.code = data.error
    throw err
  }
  return data
}

export function appOrigin() {
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

export const OAUTH_STATE_KEY = 'jos_oauth_state'

export async function getGoogleAuthUrl() {
  const data = await invokeIntegration({
    action: 'google_auth_url',
    redirect_uri: `${appOrigin()}/integrations/callback`,
    app_origin: appOrigin(),
  })
  if (data?.state && typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(OAUTH_STATE_KEY, data.state)
  }
  return data
}

export async function exchangeGoogleCode(code, state) {
  return invokeIntegration({
    action: 'google_exchange',
    code,
    state,
    redirect_uri: `${appOrigin()}/integrations/callback`,
    app_origin: appOrigin(),
  })
}

export async function saveSocialToken(platform, token) {
  return invokeIntegration({ action: 'save_social_token', platform, token })
}

export async function fetchIntegrationStatus() {
  const data = await invokeIntegration({ action: 'status' })
  const map = {}
  for (const row of data.integrations || []) {
    map[row.provider] = row
  }
  return map
}

export async function disconnectProvider(provider) {
  return invokeIntegration({ action: 'disconnect', provider })
}

export function isGoogleConnected(statusMap) {
  return statusMap?.google?.status === 'connected'
}
