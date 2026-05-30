-- Simplified product plan: one active plan per user (Build + Market steps)
-- Run in Supabase SQL Editor after prior migrations

CREATE TABLE IF NOT EXISTS product_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  idea text NOT NULL,
  build_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  market_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  adjustments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_plans_user_idx ON product_plans (user_id);

ALTER TABLE product_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own product plan" ON product_plans;
CREATE POLICY "Users own product plan"
  ON product_plans FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
