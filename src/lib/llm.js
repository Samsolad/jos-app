/**
 * App LLM entry point — Google Gemini (browser).
 * Set VITE_GEMINI_API_KEY in .env.local. Model is fixed in gemini.js (gemini-2.0-flash).
 * Note: VITE_* keys are visible in the client; restrict the key in Google AI Studio if needed.
 */
export { askGemini as askLLM } from './gemini'
