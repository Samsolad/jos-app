import { createClient } from 'npm:@supabase/supabase-js@2'

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ')

const OAUTH_STATE_TTL_MS = 15 * 60 * 1000

type IntegrationRow = {
  id: string
  provider: string
  access_token: string | null
  refresh_token: string | null
  expires_at: string | null
  metadata: Record<string, unknown>
}

function corsHeaders(req: Request): Record<string, string> {
  const allowed = (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const origin = req.headers.get('Origin') || ''
  const allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0] || ''
  return {
    ...(allowOrigin ? { 'Access-Control-Allow-Origin': allowOrigin } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  }
}

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return true
  const allowed = allowedOrigins().map((s) => s.replace(/\/$/, ''))
  return allowed.includes(origin.replace(/\/$/, ''))
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

function allowedOrigins(): string[] {
  return (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function resolveRedirectUri(redirectUri: string | undefined, appOrigin: string | undefined): string | null {
  const origins = allowedOrigins().map((s) => s.replace(/\/$/, ''))
  const app = (appOrigin || '').replace(/\/$/, '')
  const fallbackBase = origins.includes(app) ? app : origins[0] || ''
  const fallback = fallbackBase ? `${fallbackBase}/integrations/callback` : ''
  const candidate = redirectUri || fallback
  if (!candidate) return null
  try {
    const url = new URL(candidate)
    const expectedPath = '/integrations/callback'
    if (url.pathname !== expectedPath) return null
    const origin = `${url.protocol}//${url.host}`
    if (!origins.includes(origin.replace(/\/$/, ''))) return null
    return candidate
  } catch {
    return null
  }
}

function parseOAuthState(state: string | undefined, userId: string): string | null {
  if (!state) return 'OAuth state is required'
  try {
    const parsed = JSON.parse(atob(state)) as { uid?: string; ts?: number }
    if (parsed.uid !== userId) return 'OAuth state does not match signed-in user'
    if (!parsed.ts || Date.now() - parsed.ts > OAUTH_STATE_TTL_MS) return 'OAuth state expired — try connecting again'
    return null
  } catch {
    return 'Invalid OAuth state'
  }
}

function sanitizeHeaderValue(value: unknown, maxLen = 500): string {
  return String(value ?? '')
    .replace(/[\r\n]/g, ' ')
    .trim()
    .slice(0, maxLen)
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function requireServiceAdmin(serviceKey: string | undefined) {
  if (!serviceKey) return null
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  return createClient(supabaseUrl, serviceKey)
}

async function refreshGoogleToken(
  supabaseAdmin: ReturnType<typeof createClient>,
  row: IntegrationRow,
): Promise<string | null> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
  if (!clientId || !clientSecret || !row.refresh_token) return row.access_token

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: row.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) return row.access_token

  const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString()
  await supabaseAdmin
    .from('user_integrations')
    .update({
      access_token: data.access_token,
      expires_at: expiresAt,
      status: 'connected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)

  return data.access_token
}

async function getGoogleAccessToken(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
): Promise<string | null> {
  const { data: row } = await supabaseAdmin
    .from('user_integrations')
    .select('id, provider, access_token, refresh_token, expires_at, metadata')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .maybeSingle()

  if (!row?.access_token) return null

  const expires = row.expires_at ? new Date(row.expires_at).getTime() : 0
  if (expires < Date.now() + 60_000) {
    return await refreshGoogleToken(supabaseAdmin, row as IntegrationRow)
  }
  return row.access_token
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  if (req.method !== 'POST') {
    return jsonResponse(req, { error: 'Method not allowed' }, 405)
  }
  const requestOrigin = req.headers.get('Origin') || ''
  if (!isAllowedOrigin(requestOrigin)) {
    return jsonResponse(req, { error: 'Origin not allowed' }, 403)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authHeader = req.headers.get('Authorization')

  if (!authHeader) {
    return jsonResponse(req, { error: 'Missing Authorization header' }, 401)
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return jsonResponse(req, { error: 'Unauthorized' }, 401)
  }

  const supabaseAdmin = requireServiceAdmin(serviceKey)
  if (!supabaseAdmin) {
    return jsonResponse(req, {
      error: 'server_misconfigured',
      message: 'Set SUPABASE_SERVICE_ROLE_KEY in Edge Function secrets.',
    }, 503)
  }

  try {
    const body = await req.json()
    const { action, redirect_uri, code, max_results = 10, query, event, state } = body

    if (action === 'google_auth_url') {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
      if (!clientId) {
        return jsonResponse(req, {
          error: 'not_configured',
          message: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Edge Function secrets.',
        }, 503)
      }
      const safeRedirect = resolveRedirectUri(redirect_uri, body.app_origin)
      if (!safeRedirect) {
        return jsonResponse(req, { error: 'Invalid redirect URI' }, 400)
      }
      const oauthState = btoa(JSON.stringify({ uid: user.id, ts: Date.now() }))
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: safeRedirect,
        response_type: 'code',
        scope: GOOGLE_SCOPES,
        access_type: 'offline',
        prompt: 'consent',
        state: oauthState,
      })
      return jsonResponse(req, {
        url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
        state: oauthState,
      })
    }

    if (action === 'google_exchange') {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
      if (!clientId || !clientSecret) {
        return jsonResponse(req, { error: 'Google OAuth not configured on server.' }, 503)
      }
      if (!code) {
        return jsonResponse(req, { error: 'code required' }, 400)
      }
      const stateError = parseOAuthState(state, user.id)
      if (stateError) {
        return jsonResponse(req, { error: stateError }, 403)
      }
      const safeRedirect = resolveRedirectUri(redirect_uri, body.app_origin)
      if (!safeRedirect) {
        return jsonResponse(req, { error: 'Invalid redirect URI' }, 400)
      }

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: safeRedirect,
          grant_type: 'authorization_code',
        }),
      })
      const tokens = await tokenRes.json()
      if (!tokens.access_token) {
        return jsonResponse(req, { error: tokens.error_description || 'Token exchange failed' }, 400)
      }

      const expiresAt = new Date(
        Date.now() + (tokens.expires_in || 3600) * 1000,
      ).toISOString()

      const { data: saved, error: saveErr } = await supabaseAdmin
        .from('user_integrations')
        .upsert({
          user_id: user.id,
          provider: 'google',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          expires_at: expiresAt,
          scopes: GOOGLE_SCOPES.split(' '),
          status: 'connected',
          metadata: { connected_at: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,provider' })
        .select('id, provider, status, expires_at')
        .single()

      if (saveErr) {
        return jsonResponse(req, { error: saveErr.message }, 500)
      }
      return jsonResponse(req, { ok: true, integration: saved })
    }

    if (action === 'save_social_token') {
      const platform = sanitizeHeaderValue(body.platform, 32).toLowerCase()
      const token = sanitizeHeaderValue(body.token, 4096)
      if (!['linkedin', 'facebook'].includes(platform)) {
        return jsonResponse(req, { error: 'Unsupported platform' }, 400)
      }
      if (!token || token.length < 8) {
        return jsonResponse(req, { error: 'Valid token required' }, 400)
      }
      const { error: saveErr } = await supabaseAdmin.from('user_integrations').upsert({
        user_id: user.id,
        provider: platform,
        access_token: token,
        status: 'connected',
        metadata: { manual_token: true, saved_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' })
      if (saveErr) return jsonResponse(req, { error: saveErr.message }, 500)
      return jsonResponse(req, { ok: true })
    }

    if (action === 'disconnect') {
      const provider = body.provider || 'google'
      await supabaseAdmin
        .from('user_integrations')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', provider)
      return jsonResponse(req, { ok: true })
    }

    if (action === 'status') {
      const { data: rows } = await supabase
        .from('user_integrations')
        .select('provider, status, expires_at, metadata, updated_at')
      return jsonResponse(req, { integrations: rows || [] })
    }

    const accessToken = await getGoogleAccessToken(supabaseAdmin, user.id)
    if (!accessToken && ['gmail_list', 'gmail_send', 'calendar_list', 'calendar_create'].includes(action)) {
      return jsonResponse(req, {
        error: 'not_connected',
        message: 'Connect Google (Gmail + Calendar) in Integrations first.',
      }, 400)
    }

    if (action === 'gmail_list') {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${Math.min(max_results, 20)}&q=${encodeURIComponent(query || 'is:inbox newer_than:7d')}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      const list = await res.json()
      if (!res.ok) {
        return jsonResponse(req, { error: list.error?.message || 'Gmail API failed' }, res.status)
      }

      const messages = []
      for (const m of (list.messages || []).slice(0, 10)) {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        )
        const detail = await detailRes.json()
        const headers = detail.payload?.headers || []
        const getH = (n: string) => headers.find((h: { name: string }) => h.name === n)?.value || ''
        messages.push({
          id: m.id,
          threadId: detail.threadId,
          subject: getH('Subject'),
          from: getH('From'),
          date: getH('Date'),
          snippet: detail.snippet,
        })
      }
      return jsonResponse(req, { messages })
    }

    if (action === 'gmail_send') {
      const to = sanitizeHeaderValue(body.to, 320)
      const subject = sanitizeHeaderValue(body.subject, 500)
      const emailBody = sanitizeHeaderValue(body.body, 20000)
      const thread_id = sanitizeHeaderValue(body.thread_id, 128)
      if (!to || !subject || !emailBody) {
        return jsonResponse(req, { error: 'to, subject, body required' }, 400)
      }
      if (!isValidEmail(to)) {
        return jsonResponse(req, { error: 'Invalid recipient email' }, 400)
      }

      const raw = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        emailBody,
      ].join('\r\n')
      const encoded = btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

      const sendBody: Record<string, string> = { raw: encoded }
      if (thread_id) sendBody.threadId = thread_id

      const res = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sendBody),
        },
      )
      const data = await res.json()
      if (!res.ok) {
        return jsonResponse(req, { error: data.error?.message || 'Send failed' }, res.status)
      }
      return jsonResponse(req, { ok: true, message_id: data.id })
    }

    if (action === 'calendar_list') {
      const timeMin = body.time_min || new Date().toISOString()
      const timeMax = body.time_max || new Date(Date.now() + 14 * 86400000).toISOString()
      const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: String(Math.min(max_results, 50)),
      })
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      const data = await res.json()
      if (!res.ok) {
        return jsonResponse(req, { error: data.error?.message || 'Calendar API failed' }, res.status)
      }
      const events = (data.items || []).map((e: Record<string, unknown>) => ({
        id: e.id,
        title: e.summary,
        start: e.start,
        end: e.end,
        description: e.description,
      }))
      return jsonResponse(req, { events })
    }

    if (action === 'calendar_create') {
      if (!event?.title || !event?.start || !event?.end) {
        return jsonResponse(req, { error: 'event.title, start, end required' }, 400)
      }
      const res = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            summary: `[J·OS] ${sanitizeHeaderValue(event.title, 200)}`,
            description: sanitizeHeaderValue(event.description || 'Focus block from J·OS Priority Engine', 2000),
            start: { dateTime: event.start },
            end: { dateTime: event.end },
          }),
        },
      )
      const data = await res.json()
      if (!res.ok) {
        return jsonResponse(req, { error: data.error?.message || 'Create event failed' }, res.status)
      }
      return jsonResponse(req, { ok: true, event_id: data.id, htmlLink: data.htmlLink })
    }

    if (action === 'social_queue') {
      const platform = sanitizeHeaderValue(body.platform, 32).toLowerCase()
      const draft = sanitizeHeaderValue(body.draft, 10000)
      const scheduled_at = body.scheduled_at || null
      if (!platform || !draft) {
        return jsonResponse(req, { error: 'platform and draft required' }, 400)
      }
      const { data: row, error: qErr } = await supabase
        .from('social_post_queue')
        .insert({
          user_id: user.id,
          platform,
          draft,
          status: 'queued',
          scheduled_at,
        })
        .select()
        .single()
      if (qErr) return jsonResponse(req, { error: qErr.message }, 500)

      const { data: plat } = await supabaseAdmin
        .from('user_integrations')
        .select('access_token, metadata')
        .eq('user_id', user.id)
        .eq('provider', platform)
        .maybeSingle()

      if (!plat?.access_token) {
        return jsonResponse(req, {
          queued: row,
          note: `${platform} not connected — post saved for manual copy or connect in Integrations.`,
        })
      }

      return jsonResponse(req, {
        queued: row,
        note: 'Platform token stored. Configure platform API in Edge secrets for auto-publish.',
      })
    }

    return jsonResponse(req, { error: `Unknown action: ${action}` }, 400)
  } catch (err) {
    return jsonResponse(req, { error: String(err) }, 500)
  }
})
