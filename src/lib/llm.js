/**
 * App LLM — Google Gemini via Supabase Edge Function `gemini-proxy`.
 * Set secret GEMINI_API_KEY in Supabase (not VITE_*). User must be signed in.
 */
export { askGemini as askLLM } from './gemini'
