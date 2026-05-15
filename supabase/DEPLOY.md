# Deploy `gemini-proxy` Edge Function

## 1. Install Supabase CLI

https://supabase.com/docs/guides/cli

## 2. Link project (once)

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Project ref is in Dashboard → Project Settings → General.

## 3. Set Gemini secret

Dashboard → **Edge Functions** → **Secrets**, or CLI:

```bash
supabase secrets set GEMINI_API_KEY=your_google_ai_studio_key
```

## 4. Deploy function

```bash
supabase functions deploy gemini-proxy
```

## 5. Vercel / production frontend

In Vercel → **Environment Variables**, set only:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (**anon public**, not service_role)

Remove `VITE_GEMINI_API_KEY` from Vercel — it is no longer used.

Redeploy the site after changing env vars.

## Login error: "Forbidden use of secret API key in browser"

That error is **Supabase auth**, not Gemini. Fix `VITE_SUPABASE_ANON_KEY` on Vercel (anon key only), then redeploy.
