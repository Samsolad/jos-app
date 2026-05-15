import { supabase } from './supabase'

/** Fixed model — must match supabase/functions/gemini-proxy */
const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const PROXY_TIMEOUT_MS = 28_000

function parseJsonFromText(text, json) {
  if (!json) return text
  try {
    return JSON.parse(text)
  } catch {
    const stripped = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim()
    try {
      return JSON.parse(stripped)
    } catch {
      const match = stripped.match(/\{[\s\S]*\}/)
      if (match) {
        try {
          return JSON.parse(match[0])
        } catch {
          /* fall through */
        }
      }
      console.error('Could not parse Gemini response as JSON:', text.slice(0, 500))
      return null
    }
  }
}

function toGeminiContents(messages) {
  const out = []
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

function extractGeminiText(data) {
  const parts = data.candidates?.[0]?.content?.parts
  if (!parts?.length) return ''
  return parts.map((p) => p.text || '').join('')
}

/** Browser fallback when edge function is missing or slow (dev / emergency). */
async function askGeminiDirect(messages, system = '', json = false) {
  const key = import.meta.env.VITE_GEMINI_API_KEY?.trim()
  if (!key) return null

  const body = {
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

  const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    console.error('Direct Gemini error:', data.error || res.statusText)
    return json ? null : `Error: ${data.error?.message || res.statusText}`
  }
  return parseJsonFromText(extractGeminiText(data), json)
}

async function parseInvokeError(error) {
  let msg = error?.message || 'Edge function failed'
  try {
    const ctx = error?.context
    if (ctx && typeof ctx.json === 'function') {
      const body = await ctx.json()
      if (body?.error) msg = String(body.error)
    } else if (ctx && typeof ctx.text === 'function') {
      const t = await ctx.text()
      if (t) msg = t.slice(0, 200)
    }
  } catch {
    /* ignore */
  }
  return msg
}

function invokeWithTimeout(body) {
  return Promise.race([
    supabase.functions.invoke('gemini-proxy', { body }),
    new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error('AI timed out. Deploy gemini-proxy in Supabase or add VITE_GEMINI_API_KEY to .env.local.')),
        PROXY_TIMEOUT_MS,
      )
    }),
  ])
}

/**
 * Gemini via Supabase Edge Function, with timeout + optional direct fallback.
 */
export async function askGemini(messages, system = '', json = false) {
  const payload = { messages, system, json, model: GEMINI_MODEL }

  try {
    const { data, error } = await invokeWithTimeout(payload)

    if (error) {
      const msg = await parseInvokeError(error)
      console.error('gemini-proxy invoke error:', msg)
      const fallback = await askGeminiDirect(messages, system, json)
      if (fallback !== null && fallback !== undefined) return fallback
      throw new Error(
        `${msg}. Deploy gemini-proxy + GEMINI_API_KEY secret, or set VITE_GEMINI_API_KEY in .env.local.`,
      )
    }

    if (data?.error) {
      const msg = String(data.error)
      console.error('gemini-proxy error:', msg)
      const fallback = await askGeminiDirect(messages, system, json)
      if (fallback !== null && fallback !== undefined) return fallback
      throw new Error(msg)
    }

    const text = data?.text ?? ''
    if (!text && json) {
      const fallback = await askGeminiDirect(messages, system, json)
      if (fallback !== null) return fallback
      throw new Error('Empty AI response. Check gemini-proxy and GEMINI_API_KEY secret.')
    }

    return parseJsonFromText(text, json)
  } catch (err) {
    console.error('gemini-proxy:', err)
    const fallback = await askGeminiDirect(messages, system, json)
    if (fallback !== null && fallback !== undefined) return fallback
    if (json) return null
    throw err
  }
}
