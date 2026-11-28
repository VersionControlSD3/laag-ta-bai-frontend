import { ApiError } from '@/api/client'
import type { Messages } from '@/i18n'

/**
 * Turns API (`POST /v1/auth/login`) and Supabase Auth errors into copy a traveller can act on, in the
 * current language. Errors we recognise are translated; anything else keeps its own message.
 */
export function signInErrorMessage(error: unknown, t: Messages, fallback = t.auth.errors.loginFailed): string {
  const e = t.auth.errors
  const message = error instanceof Error ? error.message : ''
  if (
    (error instanceof ApiError && error.status === 401) ||
    /invalid login credentials|invalid email or password/i.test(message)
  ) {
    return e.credentials
  }
  if (/email not confirmed/i.test(message)) return e.unconfirmed
  if ((error instanceof ApiError && error.code === 'network_error') || /failed to fetch|network/i.test(message)) {
    return e.network
  }
  if (/account with this email already exists/i.test(message)) return e.exists
  if (/did not return a refresh token/i.test(message)) return e.noRefreshToken
  return message || fallback
}
