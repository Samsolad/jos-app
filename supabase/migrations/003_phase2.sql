-- Phase 2: Progressive Authority, Behaviour Engine, pgvector memory
-- Run in Supabase SQL Editor (Database → Extensions: enable "vector" first if needed)

-- Authority on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS authority_level text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS authority_stats jsonb DEFAULT '{}'::jsonb;

-- Behaviour events
CREATE TABLE IF NOT EXISTS behaviour_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  entity_type text,
  entity_id text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS behaviour_events_user_created_idx
  ON behaviour_events (user_id, created_at DESC);

ALTER TABLE behaviour_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own behaviour events" ON behaviour_events;
CREATE POLICY "Users own behaviour events"
  ON behaviour_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Vector memory (requires vector extension in Dashboard → Database → Extensions)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS memory_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source text NOT NULL,
  content text NOT NULL,
  embedding vector(768),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memory_chunks_user_idx ON memory_chunks (user_id);

ALTER TABLE memory_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own memory chunks" ON memory_chunks;
CREATE POLICY "Users own memory chunks"
  ON memory_chunks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Similarity search (cosine distance)
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(768),
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  source text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    mc.id,
    mc.source,
    mc.content,
    mc.metadata,
    1 - (mc.embedding <=> query_embedding) AS similarity
  FROM memory_chunks mc
  WHERE mc.user_id = auth.uid()
    AND mc.embedding IS NOT NULL
  ORDER BY mc.embedding <=> query_embedding
  LIMIT match_count;
$$;
