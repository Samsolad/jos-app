# J·OS Navigator — deploy without Supabase CLI

You can do everything from the **Supabase Dashboard** in the browser (works on Windows 32-bit).

---

## 0. Database — `meta` columns (Navigator tiers, costs, deps)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **SQL Editor** → **New query**.
3. Paste the contents of `supabase/migrations/001_navigator.sql` from this repo.
4. Click **Run**.

You should see success for the four `ALTER TABLE ... ADD COLUMN meta` statements.

### 0b. Profile columns (onboarding, session lock, tiers)

1. SQL Editor → **New query**.
2. Paste `supabase/migrations/002_jos_profile.sql`.
3. **Run** — adds `onboarding_completed`, `preferences`, `active_session_id`, `subscription_tier`.

### 0c. Phase 2 — authority, behaviour, pgvector memory

1. Dashboard → **Database** → **Extensions** → enable **vector** (if not already).
2. SQL Editor → paste `supabase/migrations/003_phase2.sql` → **Run**.
3. Deploy edge function **`embed-memory`** (same steps as `gemini-proxy`, code from `supabase/functions/embed-memory/index.ts`). Uses the same `GEMINI_API_KEY` secret.

### 0d. Phase 3 — integrations, chat persistence, teams

1. SQL Editor → paste `supabase/migrations/004_phase3.sql` → **Run**.
   - If you see `column "session_id" does not exist`, an older `chat_messages` table is already in the DB. Re-run the updated `004_phase3.sql` (it adds missing columns), or run only:
     ```sql
     ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS session_id text DEFAULT 'default';
     CREATE INDEX IF NOT EXISTS chat_messages_user_session_idx
       ON chat_messages (user_id, session_id, created_at DESC);
     ```
2. Deploy edge function **`integrations`** (`supabase/functions/integrations/index.ts`).
3. Edge Function **Secrets** (in addition to `GEMINI_API_KEY`):

| Secret | Purpose |
|--------|---------|
| `GOOGLE_CLIENT_ID` | Google Cloud OAuth client (Gmail + Calendar) |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `SUPABASE_SERVICE_ROLE_KEY` | **Required** — stores OAuth tokens server-side (Dashboard → Settings → API) |
| `ALLOWED_ORIGINS` | Comma-separated app origins for edge function CORS (e.g. `http://localhost:5173,https://your-app.vercel.app`) |

4. **Google Cloud Console** → APIs & Services:
   - Enable **Gmail API** and **Google Calendar API**
   - OAuth consent screen → add test users
   - Credentials → OAuth 2.0 Web client
   - **Authorized redirect URI:** `https://YOUR_APP_DOMAIN/integrations/callback` (and `http://localhost:5173/integrations/callback` for local dev)

5. In the app: **More → Connect** (or Profile → Integrations). Connect Google, scan inbox, block top-priority tasks on Calendar.

### 0e. Security hardening (RLS + token lockdown)

1. SQL Editor → paste `supabase/migrations/005_security.sql` → **Run**.
2. Re-deploy all three edge functions (`gemini-proxy`, `embed-memory`, `integrations`) with the latest code from this repo.
3. Add Edge Function secret **`ALLOWED_ORIGINS`** (comma-separated, no trailing slashes):

   ```
   http://localhost:5173,https://YOUR_APP_DOMAIN.vercel.app
   ```

4. **`SUPABASE_SERVICE_ROLE_KEY` is now required** for the `integrations` function (OAuth token storage is server-side only).
5. In Supabase Dashboard → Edge Functions → enable **Verify JWT** on all three functions.

### 0f. Product plan (simplified app)

1. SQL Editor → paste `supabase/migrations/006_product_plan.sql` → **Run**.
2. One active plan per user is stored in `product_plans` (build + market steps).

---

## 1. Gemini secret (server-side API key)

1. Dashboard → **Project Settings** → **Edge Functions** (or **Edge Functions** in the left sidebar).
2. Open **Secrets** (or **Manage secrets**).
3. Add:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** your Google AI Studio API key
4. Save.

### 1b. Optional free AI providers (Groq / OpenRouter)

If you want alternatives to Gemini in the same `gemini-proxy`, add one or both:

| Secret | Purpose |
|--------|---------|
| `GROQ_API_KEY` | Use Groq OpenAI-compatible chat endpoint |
| `OPENROUTER_API_KEY` | Use OpenRouter chat endpoint |
| `APP_BASE_URL` | Optional for OpenRouter attribution header (e.g. `https://YOUR_APP_DOMAIN`) |

Optional model overrides (Edge secrets):
- `LLM_PROVIDER` = `gemini` \| `groq` \| `openrouter`
- `GROQ_MODEL` (default: `llama-3.1-8b-instant`)
- `OPENROUTER_MODEL` (default: `meta-llama/llama-3.1-8b-instruct:free`)
- `GEMINI_MODEL` (default: `gemini-2.0-flash`)

---

## 2. Deploy `gemini-proxy` edge function (Dashboard)

1. Dashboard → **Edge Functions** → **Create a new function** (or **Deploy new function**).
2. **Name:** `gemini-proxy` (must match exactly — the app calls this name).
3. Replace the editor code with the full contents of:
   `supabase/functions/gemini-proxy/index.ts` in this repo.
4. Deploy / Save.

**JWT:** The repo sets `verify_jwt = true` in `supabase/config.toml`. In the Dashboard, ensure the function requires a valid user JWT (default for new functions is often “verify JWT” on).

5. After deploy, note the function URL (shown on the function page). The app uses `supabase.functions.invoke('gemini-proxy')` — no URL in `.env` needed if the project matches.

### 2b. Deploy `embed-memory` (Phase 2 — vector search)

1. Edge Functions → create **`embed-memory`**.
2. Paste `supabase/functions/embed-memory/index.ts`.
3. Deploy. Requires `GEMINI_API_KEY` (same secret as gemini-proxy).

### 2c. Deploy `integrations` (Phase 3 — Gmail, Calendar, social queue)

1. Edge Functions → create **`integrations`**.
2. Paste `supabase/functions/integrations/index.ts`.
3. Deploy. Set secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, and `ALLOWED_ORIGINS`.

---

## 3. Vercel (frontend)

**Environment variables** (Vercel → Project → Settings → Environment Variables):

| Variable | Value |
|----------|--------|
| `VITE_SUPABASE_URL` | Project URL (Dashboard → Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | **anon** `public` key only — never `service_role` |
| `VITE_LLM_PROVIDER` | Optional: `gemini` \| `groq` \| `openrouter` (default `gemini`) |
| `VITE_LLM_MODEL` | Optional model override for selected provider |

Remove `VITE_GEMINI_API_KEY` from Vercel if it is still set (Gemini runs on the edge function now; browser fallback is dev-only).

Security headers (CSP, HSTS, etc.) are configured in `vercel.json` and apply on redeploy.

Redeploy the site after changing env vars.

---

## 4. Local dev

1. `.env.local` — only Supabase URL + anon key (see `.env.example`).
2. `npm run dev`
3. Sign in before using Navigator AI (edge function checks auth).

Run `npm run check-env` to validate keys without printing secrets.

---

## Login: “Forbidden use of secret API key in browser”

That is **wrong Supabase key in the browser**, not Gemini.

- Use **anon public** for `VITE_SUPABASE_ANON_KEY` on Vercel and in `.env.local`.
- Never put **service_role** in any `VITE_*` variable.

---

## Optional: Supabase CLI (64-bit Windows only)

If you later use 64-bit Windows or WSL, you can use:

```bash
supabase login
supabase link --project-ref YOUR_REF
supabase secrets set GEMINI_API_KEY=your_key
supabase functions deploy gemini-proxy
```

Not required if you use the Dashboard steps above.
