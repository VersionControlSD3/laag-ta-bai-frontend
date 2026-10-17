// localStorage wrapper that never throws (private mode, blocked storage).
// Used for offline bookmarks, cached chats and preferences (SRS 3.3.2, 3.6.3.2).

const PREFIX = 'laagtabai:'

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage full or unavailable: the app keeps working without persistence.
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // ignore
  }
}

/** Removes cached content (bookmarks, chats) but keeps preferences and sign-in. */
export function clearOfflineCache(): void {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(PREFIX + 'bookmarks') || key.startsWith(PREFIX + 'chat:'))
      .forEach((key) => localStorage.removeItem(key))
  } catch {
    // ignore
  }
}
