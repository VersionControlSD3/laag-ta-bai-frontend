import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from './env'

/**
 * Browser Supabase client, used only for authentication. App data goes through
 * the API. Null when Supabase isn't configured (local dev without Supabase).
 */
export const supabase: SupabaseClient | null =
  env.supabaseUrl && env.supabasePublishableKey ? createClient(env.supabaseUrl, env.supabasePublishableKey) : null
