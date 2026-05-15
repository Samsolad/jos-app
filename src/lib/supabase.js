import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfigError } from './supabaseKey'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const supabaseConfigError = getSupabaseConfigError(supabaseUrl, supabaseAnonKey)

if (supabaseConfigError) {
  console.error('[jos-app]', supabaseConfigError)
}

export const supabase = createClient(
  supabaseUrl || 'https://invalid.supabase.co',
  supabaseAnonKey || 'invalid-anon-key',
)

export function isSupabaseConfigured() {
  return !supabaseConfigError
}
