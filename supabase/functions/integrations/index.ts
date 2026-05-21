import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ')

type IntegrationRow = {
  id: string
  provider: string
  access_token: string | null
  refresh_token: string | null
  expires_at: string | null
  metadata: Record<string, unknown>
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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authHeader = req.headers.get('Authorization')

  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401)
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const supabaseAdmin = serviceKey
    ? createClient(supabaseUrl, serviceKey)
    : supabase

  try {
    const body = await req.json()
    const { action, redirect_uri, code, max_results = 10, query, event } = body

    // ── OAuth: auth URL ─────────────────────────────────────────────
    if (action === 'google_auth_url') {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
      if (!clientId) {
        return jsonResponse({
          error: 'not_configured',
          message: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Edge Function secrets.',
        }, 503)
      }
      const state = btoa(JSON.stringify({ uid: user.id, ts: Date.now() }))
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirect_uri || `${body.app_origin || ''}/integrations/callback`,
        response_type: 'code',
        scope: GOOGLE_SCOPES,
        access_type: 'offline',
        prompt: 'consent',
        state,
      })
      return jsonResponse({
        url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
        state,
      })
    }

    // ── OAuth: exchange code ──────────────────────────────────────────
    if (action === 'google_exchange') {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
      if (!clientId || !clientSecret) {
        return jsonResponse({ error: 'Google OAuth not configured on server.' }, 503)
      }
      if (!code) {
        return jsonResponse({ error: 'code required' }, 400)
      }

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirect_uri || `${body.app_origin}/integrations/callback`,
          grant_type: 'authorization_code',
        }),
      })
      const tokens = await tokenRes.json()
      if (!tokens.access_token) {
        return jsonResponse({ error: tokens.error_description || 'Token exchange failed' }, 400)
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
        return jsonResponse({ error: saveErr.message }, 500)
      }
      return jsonResponse({ ok: true, integration: saved })
    }

    // ── Disconnect ────────────────────────────────────────────────────
    if (action === 'disconnect') {
      const provider = body.provider || 'google'
      await supabaseAdmin
        .from('user_integrations')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', provider)
      return jsonResponse({ ok: true })
    }

    // ── Status list ───────────────────────────────────────────────────
    if (action === 'status') {
      const { data: rows } = await supabase
        .from('user_integrations')
        .select('provider, status, expires_at, metadata, updated_at')
      return jsonResponse({ integrations: rows || [] })
    }

    const accessToken = await getGoogleAccessToken(supabaseAdmin, user.id)
    if (!accessToken && ['gmail_list', 'gmail_send', 'calendar_list', 'calendar_create'].includes(action)) {
      return jsonResponse({
        error: 'not_connected',
        message: 'Connect Google (Gmail + Calendar) in Integrations first.',
      }, 400)
    }

    // ── Gmail: list recent ────────────────────────────────────────────
    if (action === 'gmail_list') {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${Math.min(max_results, 20)}&q=${encodeURIComponent(query || 'is:inbox newer_than:7d')}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      const list = await res.json()
      if (!res.ok) {
        return jsonResponse({ error: list.error?.message || 'Gmail API failed' }, res.status)
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
      return jsonResponse({ messages })
    }

    // ── Gmail: send (user-approved draft) ─────────────────────────────
    if (action === 'gmail_send') {
      const { to, subject, body: emailBody, thread_id } = body
      if (!to || !subject || !emailBody) {
        return jsonResponse({ error: 'to, subject, body required' }, 400)
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
        return jsonResponse({ error: data.error?.message || 'Send failed' }, res.status)
      }
      return jsonResponse({ ok: true, message_id: data.id })
    }

    // ── Calendar: list events ─────────────────────────────────────────
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
        return jsonResponse({ error: data.error?.message || 'Calendar API failed' }, res.status)
      }
      const events = (data.items || []).map((e: Record<string, unknown>) => ({
        id: e.id,
        title: e.summary,
        start: e.start,
        end: e.end,
        description: e.description,
      }))
      return jsonResponse({ events })
    }

    // ── Calendar: create focus block ──────────────────────────────────
    if (action === 'calendar_create') {
      if (!event?.title || !event?.start || !event?.end) {
        return jsonResponse({ error: 'event.title, start, end required' }, 400)
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
            summary: `[J·OS] ${event.title}`,
            description: event.description || 'Focus block from J·OS Priority Engine',
            start: { dateTime: event.start },
            end: { dateTime: event.end },
          }),
        },
      )
      const data = await res.json()
      if (!res.ok) {
        return jsonResponse({ error: data.error?.message || 'Create event failed' }, res.status)
      }
      return jsonResponse({ ok: true, event_id: data.id, htmlLink: data.htmlLink })
    }

    // ── Social: queue post (LinkedIn/Facebook need platform API keys) ─
    if (action === 'social_queue') {
      const { platform, draft, scheduled_at } = body
      if (!platform || !draft) {
        return jsonResponse({ error: 'platform and draft required' }, 400)
      }
      const { data: row, error: qErr } = await supabase
        .from('social_post_queue')
        .insert({
          user_id: user.id,
          platform,
          draft,
          status: 'queued',
          scheduled_at: scheduled_at || null,
        })
        .select()
        .single()
      if (qErr) return jsonResponse({ error: qErr.message }, 500)

      // If platform tokens exist, attempt publish (stub for LinkedIn/Facebook APIs)
      const { data: plat } = await supabase
        .from('user_integrations')
        .select('access_token, metadata')
        .eq('user_id', user.id)
        .eq('provider', platform)
        .maybeSingle()

      if (!plat?.access_token) {
        return jsonResponse({
          queued: row,
          note: `${platform} not connected — post saved for manual copy or connect in Integrations.`,
        })
      }

      return jsonResponse({
        queued: row,
        note: 'Platform token stored. Configure platform API in Edge secrets for auto-publish.',
      })
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400)
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500)
  }
})
