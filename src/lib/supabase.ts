import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from './env'

// Capture the callback before Supabase consumes the URL during initialization.
const callbackUrl = new URL(window.location.href)
export const hasRecoveryCallback = callbackUrl.pathname === '/reset-password' &&
  (new URLSearchParams(callbackUrl.hash.slice(1)).get('type') === 'recovery' || callbackUrl.searchParams.has('code'))

/**
 * Browser Supabase client, used only for authentication. App data goes through
 * the API. Null when Supabase isn't configured (local dev without Supabase).
 */
export const supabase: SupabaseClient | null =
  env.supabaseUrl && env.supabasePublishableKey ? createClient(env.supabaseUrl, env.supabasePublishableKey) : null
