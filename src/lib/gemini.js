import { supabase } from './supabase'

/** Fixed model — must match supabase/functions/gemini-proxy */
const GEMINI_MODEL = 'gemini-2.0-flash'

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

function proxyErrorMessage(error, data) {
  const fromBody = data?.error
  if (typeof fromBody === 'string') return fromBody
  if (error?.message) return error.message
  return 'AI request failed. Deploy gemini-proxy and set GEMINI_API_KEY in Supabase secrets.'
}

/**
 * Gemini via Supabase Edge Function — API key stays server-side (GEMINI_API_KEY secret).
 * @param {{ role: string, content: string }[]} messages
 * @param {string} system
 * @param {boolean} json
 */
export async function askGemini(messages, system = '', json = false) {
  try {
    const { data, error } = await supabase.functions.invoke('gemini-proxy', {
      body: { messages, system, json, model: GEMINI_MODEL },
    })

    if (error) {
      console.error('gemini-proxy invoke error:', error)
      return json ? null : proxyErrorMessage(error, data)
    }

    if (data?.error) {
      console.error('gemini-proxy error:', data.error)
      return json ? null : String(data.error)
    }

    const text = data?.text ?? ''
    if (!text && json) {
      console.error('Empty gemini-proxy response:', data)
      return null
    }

    return parseJsonFromText(text, json)
  } catch (err) {
    console.error('gemini-proxy fetch error:', err)
    return json ? null : 'Could not connect right now.'
  }
}
