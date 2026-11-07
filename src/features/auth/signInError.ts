import { ApiError } from '@/api/client'

/** Turns API (`POST /v1/auth/login`) and Supabase Auth errors into copy a traveller can act on. */
export function signInErrorMessage(error: unknown, fallback = 'Log in failed. Please try again.'): string {
  const message = error instanceof Error ? error.message : ''
  if (
    (error instanceof ApiError && error.status === 401) ||
    /invalid login credentials|invalid email or password/i.test(message)
  ) {
    return "That email and password don't match. Check them and try again."
  }
  if (/email not confirmed/i.test(message)) return 'Confirm your email first: open the link we sent you, then log in.'
  if ((error instanceof ApiError && error.code === 'network_error') || /failed to fetch|network/i.test(message)) {
    return "We couldn't reach the server. Check your connection and try again."
  }
  return message || fallback
}
