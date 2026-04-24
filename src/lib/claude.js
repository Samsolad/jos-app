const CLAUDE_KEY = import.meta.env.VITE_ANTHROPIC_KEY

export async function askClaude(messages, system = '', json = false) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        system,
        messages,
      }),
    })

    const data = await res.json()

    // Log errors visibly during development
    if (data.error) {
      console.error('Claude API error:', data.error)
      return json ? null : `Error: ${data.error.message || 'Unknown error'}`
    }

    const text = data.content?.map(b => b.text || '').join('') || ''

    if (!json) return text

    // Try parsing JSON — handle markdown fences and extra text
    try {
      // First try raw
      return JSON.parse(text)
    } catch {
      // Try stripping markdown fences
      const stripped = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
      try {
        return JSON.parse(stripped)
      } catch {
        // Try extracting JSON from surrounding text
        const match = stripped.match(/\{[\s\S]*\}/)
        if (match) {
          try { return JSON.parse(match[0]) }
          catch { /* fall through */ }
        }
        console.error('Could not parse Claude response as JSON:', text.slice(0, 500))
        return null
      }
    }
  } catch (err) {
    console.error('Claude fetch error:', err)
    return json ? null : 'Could not connect right now.'
  }
}