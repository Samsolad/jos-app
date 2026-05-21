import { askLLM } from './llm'
import { saveInboxItems } from './gmail'

const WHATSAPP_SYSTEM = `Extract action items and commitments from a WhatsApp chat paste.
Return JSON only: { "items": [ { "title": "task", "due_iso": null or ISO8601, "notes": "who said what" } ] }
Max 8 items. Ignore greetings and emoji-only lines.`

export async function extractFromWhatsAppPaste(threadText) {
  if (!threadText?.trim()) return []

  const result = await askLLM(
    [{ role: 'user', content: threadText.slice(0, 15000) }],
    WHATSAPP_SYSTEM,
    true,
  )

  const items = (result?.items || []).filter((x) => x?.title)
  if (!items.length) return []

  return saveInboxItems('whatsapp', items, { source: 'paste' })
}

export async function draftWhatsAppReply(threadText, profile) {
  const name = profile?.name || 'the user'
  const sys = `Draft a short WhatsApp reply in ${name}'s voice. Return JSON: { "reply": "message text" }`
  return askLLM(
    [{ role: 'user', content: `Thread:\n${threadText.slice(0, 8000)}\n\nDraft a reply.` }],
    sys,
    true,
  )
}
