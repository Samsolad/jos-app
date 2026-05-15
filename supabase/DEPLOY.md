# J·OS Navigator — deploy without Supabase CLI

You can do everything from the **Supabase Dashboard** in the browser (works on Windows 32-bit).

---

## 0. Database — `meta` columns (Navigator tiers, costs, deps)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **SQL Editor** → **New query**.
3. Paste the contents of `supabase/migrations/001_navigator.sql` from this repo.
4. Click **Run**.

You should see success for the four `ALTER TABLE ... ADD COLUMN meta` statements.

---

## 1. Gemini secret (server-side API key)

1. Dashboard → **Project Settings** → **Edge Functions** (or **Edge Functions** in the left sidebar).
2. Open **Secrets** (or **Manage secrets**).
3. Add:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** your Google AI Studio API key
4. Save.

---

## 2. Deploy `gemini-proxy` edge function (Dashboard)

1. Dashboard → **Edge Functions** → **Create a new function** (or **Deploy new function**).
2. **Name:** `gemini-proxy` (must match exactly — the app calls this name).
3. Replace the editor code with the full contents of:
   `supabase/functions/gemini-proxy/index.ts` in this repo.
4. Deploy / Save.

**JWT:** The repo sets `verify_jwt = true` in `supabase/config.toml`. In the Dashboard, ensure the function requires a valid user JWT (default for new functions is often “verify JWT” on).

5. After deploy, note the function URL (shown on the function page). The app uses `supabase.functions.invoke('gemini-proxy')` — no URL in `.env` needed if the project matches.

---

## 3. Vercel (frontend)

**Environment variables** (Vercel → Project → Settings → Environment Variables):

| Variable | Value |
|----------|--------|
| `VITE_SUPABASE_URL` | Project URL (Dashboard → Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | **anon** `public` key only — never `service_role` |

Remove `VITE_GEMINI_API_KEY` from Vercel if it is still set (Gemini runs on the edge function now).

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
