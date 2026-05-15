-- Run in Supabase SQL Editor (Dashboard → SQL) if not using CLI migrate.
-- Navigator metadata on existing tables (backward-compatible).

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;
ALTER TABLE goal_steps ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_tasks_meta_tier ON tasks ((meta->>'tier'));
