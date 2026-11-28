import { MESSAGES, type Messages } from './index'

/**
 * Text for an error in the current language. Messages the app writes itself (`api/client.ts`:
 * offline, busy, generic) are known English strings, so they are swapped for the translation;
 * anything else, such as an API validation message, is shown as the server wrote it.
 */
export function errorText(error: unknown, t: Messages, fallback = t.common.errors.generic): string {
  const message = error instanceof Error ? error.message : ''
  if (!message) return fallback
  const en = MESSAGES.en.common.errors
  const key = (Object.keys(en) as (keyof typeof en)[]).find((k) => en[k] === message)
  return key ? t.common.errors[key] : message
}
