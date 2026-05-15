import { createClient } from 'npm:@supabase/supabase-js@2'

const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  if (!geminiKey) {
    return new Response(
      JSON.stringify({ error: 'GEMINI_API_KEY secret is not set on this project.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { messages, system = '', json = false } = await req.json()
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: Record<string, unknown> = {
      contents: toGeminiContents(messages),
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
      return new Response(JSON.stringify({ error: msg }), {
        status: res.status || 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const text = extractText(data)
    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
