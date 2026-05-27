import { createClient } from 'npm:@supabase/supabase-js@2'

const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const MAX_MESSAGES = 20
const MAX_TOTAL_CHARS = 50000
const MAX_SYSTEM_CHARS = 10000

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

type ChatMessage = { role: string; content: string }

function toGeminiContents(messages: ChatMessage[]) {
  const out: { role: string; parts: { text: string }[] }[] = []
  for (const m of messages) {
    const role = m.role === 'assistant' ? 'model' : 'user'
    const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    const last = out[out.length - 1]
    if (last && last.role === role) {
      last.parts[0].text += `\n\n${text}`
    } else {
      out.push({ role, parts: [{ text }] })
    }
  }
  return out
}

function extractText(data: Record<string, unknown>): string {
  const candidates = data.candidates as { content?: { parts?: { text?: string }[] } }[] | undefined
  const parts = candidates?.[0]?.content?.parts
  if (!parts?.length) return ''
  return parts.map((p) => p.text || '').join('')
}

function validateMessages(messages: unknown, system: unknown): string | null {
  if (!Array.isArray(messages)) return 'messages array required'
  if (messages.length > MAX_MESSAGES) return `Too many messages (max ${MAX_MESSAGES})`
  let total = 0
  for (const m of messages) {
    const text = typeof m?.content === 'string' ? m.content : JSON.stringify(m?.content ?? '')
    total += text.length
  }
  if (total > MAX_TOTAL_CHARS) return `Payload too large (max ${MAX_TOTAL_CHARS} chars)`
  if (typeof system === 'string' && system.length > MAX_SYSTEM_CHARS) {
    return `System prompt too large (max ${MAX_SYSTEM_CHARS} chars)`
  }
  return null
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
    return jsonResponse(req, { error: 'GEMINI_API_KEY secret is not set on this project.' }, 500)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
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

  try {
    const { messages, system = '', json = false } = await req.json()
    const validationError = validateMessages(messages, system)
    if (validationError) {
      return jsonResponse(req, { error: validationError }, 400)
    }

    const body: Record<string, unknown> = {
      contents: toGeminiContents(messages as ChatMessage[]),
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.7,
        ...(json ? { responseMimeType: 'application/json' } : {}),
      },
    }
    if (system) {
      body.systemInstruction = { parts: [{ text: system }] }
    }

    const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(geminiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (!res.ok || data.error) {
      const msg = data.error?.message || res.statusText || 'Gemini request failed'
      return jsonResponse(req, { error: msg }, res.status || 502)
    }

    return jsonResponse(req, { text: extractText(data) })
  } catch (err) {
    return jsonResponse(req, { error: String(err) }, 500)
  }
})
