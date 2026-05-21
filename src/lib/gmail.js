import { invokeIntegration } from './integrations'
import { askLLM } from './llm'
import { supabase } from './supabase'

const EXTRACT_SYSTEM = `You extract commitments and deadlines from email snippets.
Return JSON only: { "items": [ { "title": "short task", "due_iso": "ISO8601 or null", "notes": "context" } ] }
Max 5 items. Only clear actionable commitments.`

export async function listRecentEmails(query = 'is:inbox newer_than:7d', max = 10) {
  const data = await invokeIntegration({
    action: 'gmail_list',
    query,
    max_results: max,
  })
  return data.messages || []
}

export async function extractCommitmentsFromEmails(messages) {
  if (!messages?.length) return []

  const blob = messages
    .map((m, i) => `${i + 1}. From: ${m.from}\nSubject: ${m.subject}\n${m.snippet}`)
    .join('\n\n')

  const result = await askLLM(
    [{ role: 'user', content: blob.slice(0, 12000) }],
    EXTRACT_SYSTEM,
    true,
  )

  const items = result?.items || []
  return items.filter((x) => x?.title)
}

export async function saveInboxItems(provider, items, sourceMeta = {}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !items.length) return []

  const rows = items.map((item) => ({
    user_id: user.id,
    provider,
    item_type: 'action',
    title: item.title,
    body: item.notes || null,
    due_at: item.due_iso ? new Date(item.due_iso).toISOString() : null,
    status: 'pending',
    metadata: { ...sourceMeta, extracted_at: new Date().toISOString() },
  }))

  const { data, error } = await supabase.from('integration_inbox').insert(rows).select()
  if (error) {
    console.warn('[gmail] inbox insert failed:', error.message)
    return []
  }
  return data || []
}

export async function draftReply(emailContext, profile) {
  const name = profile?.name || 'the user'
  const sys = `Draft a professional email reply in ${name}'s voice. Return JSON: { "subject": "Re: ...", "body": "full email text" }`
  return askLLM(
    [{ role: 'user', content: `Reply to:\n${emailContext}` }],
    sys,
    true,
  )
}

export async function sendApprovedEmail({ to, subject, body, thread_id }) {
  return invokeIntegration({
    action: 'gmail_send',
    to,
    subject,
    body,
    thread_id,
  })
}
