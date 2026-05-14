const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_MODEL =
  import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash'

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

/** Fold Claude-style history into Gemini alternating user/model turns. */
function toGeminiContents(messages) {
  const out = []
  for (const m of messages) {
    const role = m.role === 'assistant' ? 'model' : 'user'
    const text =
      typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    const last = out[out.length - 1]
    if (last && last.role === role) {
      last.parts[0].text += `\n\n${text}`
    } else {
      out.push({ role, parts: [{ text }] })
    }
  }
  return out
}

function extractText(data) {
  const parts = data.candidates?.[0]?.content?.parts
  if (!parts?.length) return ''
  return parts.map((p) => p.text || '').join('')
}

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

/**
 * Google Gemini — same shape as the former Claude helper for drop-in use.
 * @param {{ role: string, content: string }[]} messages
 * @param {string} system
 * @param {boolean} json - request JSON mode + parse object
 */
export async function askGemini(messages, system = '', json = false) {
  if (!GEMINI_KEY) {
    console.error('Missing VITE_GEMINI_API_KEY')
    return json ? null : 'Add your Gemini API key (VITE_GEMINI_API_KEY) in .env.local.'
  }

  try {
    const contents = toGeminiContents(messages)
    const body = {
      contents,
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.7,
        ...(json ? { responseMimeType: 'application/json' } : {}),
      },
    }
    if (system) {
      body.systemInstruction = { parts: [{ text: system }] }
    }

    const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(GEMINI_KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (data.error) {
      console.error('Gemini API error:', data.error)
      return json ? null : `Error: ${data.error.message || 'Unknown error'}`
    }

    const reason = data.candidates?.[0]?.finishReason
    if (reason && reason !== 'STOP' && reason !== 'MAX_TOKENS') {
      console.warn('Gemini finishReason:', reason)
    }

    const text = extractText(data)
    if (!text && json) {
      console.error('Empty Gemini response:', JSON.stringify(data).slice(0, 400))
      return null
    }

    return parseJsonFromText(text, json)
  } catch (err) {
    console.error('Gemini fetch error:', err)
    return json ? null : 'Could not connect right now.'
  }
}
