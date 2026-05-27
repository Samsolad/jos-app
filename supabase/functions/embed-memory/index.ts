import { createClient } from 'npm:@supabase/supabase-js@2'

const EMBED_MODEL = 'text-embedding-004'
const EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent`
const MAX_TEXT_CHARS = 8000

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

function allowedOrigins(): string[] {
  return (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/\/$/, ''))
}

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return true
  return allowedOrigins().includes(origin.replace(/\/$/, ''))
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
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

  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  if (!geminiKey) {
    return jsonResponse(req, { error: 'GEMINI_API_KEY secret is not set.' }, 500)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse(req, { error: 'Missing Authorization' }, 401)
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return jsonResponse(req, { error: 'Unauthorized' }, 401)
  }

  try {
    const { text } = await req.json()
    if (!text || typeof text !== 'string') {
      return jsonResponse(req, { error: 'text required' }, 400)
    }

    const res = await fetch(`${EMBED_URL}?key=${encodeURIComponent(geminiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text: text.slice(0, MAX_TEXT_CHARS) }] },
      }),
    })

    const data = await res.json()
    if (!res.ok || data.error) {
      const msg = data.error?.message || res.statusText || 'Embedding failed'
      return jsonResponse(req, { error: msg }, res.status || 502)
    }

    const embedding = data.embedding?.values
    if (!Array.isArray(embedding)) {
      return jsonResponse(req, { error: 'No embedding in response' }, 502)
    }

    return jsonResponse(req, { embedding })
  } catch (err) {
    return jsonResponse(req, { error: String(err) }, 500)
  }
})
