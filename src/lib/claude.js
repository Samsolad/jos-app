import { supabase } from './supabase'

export async function askClaude(messages, system = '', json = false) {
  try {
    const { data, error } = await supabase.functions.invoke('claude-proxy', {
      body: {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        system,
        messages,
      }
    })

    if (error) {
      console.error('Edge function error:', error)
      return json ? null : 'Could not connect right now.'
    }

    const text = data?.content?.map(b => b.text || '').join('') || ''

    if (!json) return text

    try {
      return JSON.parse(text.replace(/```json|```/g, '').trim())
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        try { return JSON.parse(match[0]) } catch { /* fall through */ }
      }
      console.error('Could not parse JSON:', text.slice(0, 300))
      return null
    }
  } catch (err) {
    console.error('Claude error:', err)
    return json ? null : 'Could not connect right now.'
  }
}