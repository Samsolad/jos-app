/**
 * pgvector memory — episodic chunks with local fallback when DB/embed unavailable.
 */
import { supabase } from './supabase'

const LOCAL_CHUNKS_KEY = 'jos_memory_chunks'
const EMBED_DIM = 768

function readLocalChunks() {
  try {
    const raw = localStorage.getItem(LOCAL_CHUNKS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeLocalChunks(chunks) {
  localStorage.setItem(LOCAL_CHUNKS_KEY, JSON.stringify(chunks.slice(-80)))
}

function chunkText(text, maxLen = 500) {
  const parts = []
  const paragraphs = (text || '').split(/\n\n+/).filter(Boolean)
  let buf = ''
  for (const p of paragraphs) {
    if ((buf + p).length > maxLen && buf) {
      parts.push(buf.trim())
      buf = p
    } else {
      buf = buf ? `${buf}\n\n${p}` : p
    }
  }
  if (buf.trim()) parts.push(buf.trim())
  if (!parts.length && text?.trim()) parts.push(text.trim().slice(0, maxLen))
  return parts
}

async function embedText(text) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const { data, error } = await supabase.functions.invoke('embed-memory', {
    body: { text: text.slice(0, 8000) },
  })

  if (error || !data?.embedding) {
    console.warn('[memory] embed failed:', error?.message || data?.error)
    return null
  }
  return data.embedding
}

function keywordScore(query, content) {
  const qWords = query.toLowerCase().split(/\W+/).filter((w) => w.length > 3)
  const text = content.toLowerCase()
  return qWords.reduce((s, w) => (text.includes(w) ? s + 1 : s), 0)
}

function searchLocal(query, k = 5) {
  const chunks = readLocalChunks()
  return chunks
    .map((c) => ({ ...c, similarity: keywordScore(query, c.content) }))
    .filter((c) => c.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k)
}

export async function ingestMemory(userId, source, text, metadata = {}) {
  if (!text?.trim() || !userId) return []

  const parts = chunkText(text)
  const inserted = []

  for (const content of parts) {
    const embedding = await embedText(content)

    const row = {
      user_id: userId,
      source,
      content,
      metadata: { ...metadata, ingested_at: new Date().toISOString() },
      ...(embedding ? { embedding } : {}),
    }

    const { data, error } = await supabase
      .from('memory_chunks')
      .insert(row)
      .select('id, source, content')
      .single()

    if (!error && data) {
      inserted.push(data)
    } else {
      const local = readLocalChunks()
      local.push({
        id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        source,
        content,
        metadata: row.metadata,
        embedding: embedding || null,
      })
      writeLocalChunks(local)
      inserted.push({ id: 'local', source, content })
    }
  }

  return inserted
}

export async function searchMemories(query, k = 5) {
  if (!query?.trim()) return []

  const embedding = await embedText(query)

  if (embedding?.length === EMBED_DIM) {
    const { data, error } = await supabase.rpc('match_memories', {
      query_embedding: embedding,
      match_count: k,
    })

    if (!error && data?.length) {
      return data.map((r) => ({
        source: r.source,
        content: r.content,
        similarity: r.similarity,
      }))
    }
  }

  return searchLocal(query, k).map((r) => ({
    source: r.source,
    content: r.content,
    similarity: r.similarity / 10,
  }))
}

export async function buildMemoryContext(query) {
  const hits = await searchMemories(query, 5)
  if (!hits.length) return ''

  return `\nRELEVANT MEMORY (from past context):\n${hits
    .map((h, i) => `${i + 1}. [${h.source}] ${h.content}`)
    .join('\n')}\n`
}

export function clearLocalMemory() {
  localStorage.removeItem(LOCAL_CHUNKS_KEY)
}
