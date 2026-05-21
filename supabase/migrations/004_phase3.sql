-- Phase 3: Communication Engine, integrations, chat persistence, teams
-- Run in Supabase SQL Editor after 003_phase2.sql

-- OAuth / API connections (tokens only readable by owner via RLS)
CREATE TABLE IF NOT EXISTS user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  scopes text[] DEFAULT '{}',
  status text DEFAULT 'connected',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS user_integrations_user_idx ON user_integrations (user_id);

ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own integrations" ON user_integrations;
CREATE POLICY "Users own integrations"
  ON user_integrations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Inbox: commitments extracted from Gmail / WhatsApp paste
CREATE TABLE IF NOT EXISTS integration_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  external_id text,
  item_type text DEFAULT 'action',
  title text NOT NULL,
  body text,
  due_at timestamptz,
  status text DEFAULT 'pending',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS integration_inbox_user_status_idx
  ON integration_inbox (user_id, status, created_at DESC);

ALTER TABLE integration_inbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own inbox" ON integration_inbox;
CREATE POLICY "Users own inbox"
  ON integration_inbox FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Chat persistence (replaces localStorage-only history)
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id text DEFAULT 'default',
  role text NOT NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Table may already exist from an older/partial schema without session_id
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS session_id text DEFAULT 'default';
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS chat_messages_user_session_idx
  ON chat_messages (user_id, session_id, created_at DESC);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own chat messages" ON chat_messages;
CREATE POLICY "Users own chat messages"
  ON chat_messages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Calendar focus blocks synced from high-priority tasks
CREATE TABLE IF NOT EXISTS calendar_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id uuid,
  project_id uuid,
  title text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  gcal_event_id text,
  status text DEFAULT 'scheduled',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calendar_blocks_user_start_idx
  ON calendar_blocks (user_id, start_at);

ALTER TABLE calendar_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own calendar blocks" ON calendar_blocks;
CREATE POLICY "Users own calendar blocks"
  ON calendar_blocks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Social post queue (LinkedIn / Facebook — approval before send)
CREATE TABLE IF NOT EXISTS social_post_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL,
  draft text NOT NULL,
  status text DEFAULT 'draft',
  scheduled_at timestamptz,
  external_post_id text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  posted_at timestamptz
);

CREATE INDEX IF NOT EXISTS social_post_queue_user_idx
  ON social_post_queue (user_id, status, created_at DESC);

ALTER TABLE social_post_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own social queue" ON social_post_queue;
CREATE POLICY "Users own social queue"
  ON social_post_queue FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Team tier (Phase 3)
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  role text DEFAULT 'member',
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz,
  UNIQUE (team_id, email)
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team owners manage teams" ON teams;
CREATE POLICY "Team owners manage teams"
  ON teams FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Members see own team membership" ON team_members;
CREATE POLICY "Members see own team membership"
  ON team_members FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners manage team members" ON team_members;
CREATE POLICY "Owners manage team members"
  ON team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners update team members" ON team_members;
CREATE POLICY "Owners update team members"
  ON team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners delete team members" ON team_members;
CREATE POLICY "Owners delete team members"
  ON team_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id AND t.owner_id = auth.uid()
    )
  );

ALTER TABLE projects ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE SET NULL;
