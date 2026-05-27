-- Security hardening: RLS on core tables, token column lockdown, profile field guards
-- Run in Supabase SQL Editor after 004_phase3.sql

-- ── RLS helper: user-owned rows via user_id ───────────────────────────────
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'projects', 'tasks', 'goals', 'goal_steps', 'habits', 'habit_logs',
    'revenue', 'investors', 'investor_updates', 'social_posts', 'social_platforms',
    'family_contacts'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "Users own rows" ON %I', tbl);
      EXECUTE format(
        'CREATE POLICY "Users own rows" ON %I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- ── Profiles ──────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own profile" ON profiles;
CREATE POLICY "Users manage own profile"
  ON profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Block client self-elevation of subscription tier; clamp authority by tier
CREATE OR REPLACE FUNCTION protect_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_auth text;
  max_rank int;
  new_rank int;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier THEN
      NEW.subscription_tier := OLD.subscription_tier;
    END IF;

    max_auth := CASE COALESCE(NEW.subscription_tier, 'free')
      WHEN 'operator' THEN 'execute'
      WHEN 'team' THEN 'execute'
      WHEN 'personal' THEN 'preview'
      ELSE 'suggest'
    END;

    IF NEW.authority_level IS NOT NULL THEN
      max_rank := CASE max_auth
        WHEN 'observe' THEN 0 WHEN 'suggest' THEN 1
        WHEN 'preview' THEN 2 WHEN 'execute' THEN 3 ELSE 1 END;
      new_rank := CASE NEW.authority_level
        WHEN 'observe' THEN 0 WHEN 'suggest' THEN 1
        WHEN 'preview' THEN 2 WHEN 'execute' THEN 3 ELSE 1 END;
      IF new_rank > max_rank THEN
        NEW.authority_level := max_auth;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_sensitive_fields ON profiles;
CREATE TRIGGER protect_profile_sensitive_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_sensitive_fields();

-- ── Integration tokens: hide from browser clients ───────────────────────
DROP POLICY IF EXISTS "Users own integrations" ON user_integrations;

CREATE POLICY "Users read integration metadata"
  ON user_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage integration metadata"
  ON user_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update integration metadata"
  ON user_integrations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete integrations"
  ON user_integrations FOR DELETE
  USING (auth.uid() = user_id);

REVOKE ALL ON user_integrations FROM authenticated;
GRANT SELECT (id, user_id, provider, expires_at, scopes, status, metadata, created_at, updated_at)
  ON user_integrations TO authenticated;
GRANT INSERT (user_id, provider, status, metadata, scopes, expires_at, created_at, updated_at)
  ON user_integrations TO authenticated;
GRANT UPDATE (status, metadata, scopes, expires_at, updated_at)
  ON user_integrations TO authenticated;
GRANT DELETE ON user_integrations TO authenticated;
