import { useCallback, useSyncExternalStore } from 'react'
import type { Landmark } from '@/api/types'
import { readJson, writeJson } from '@/lib/storage'

// Saved landmarks with full story text for offline reading (SRS 3.1.1.3.c).
export type Bookmark = Landmark & { savedAt: string }

const KEY = 'bookmarks'
const listeners = new Set<() => void>()
let cache: Bookmark[] | null = null

function getSnapshot(): Bookmark[] {
  cache ??= readJson<Bookmark[]>(KEY, [])
  return cache
}

function setBookmarks(next: Bookmark[]) {
  cache = next
  writeJson(KEY, next)
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Drops the in-memory copy so the next read comes from storage (used after clearing the cache). */
export function resetBookmarksCache() {
  cache = null
  listeners.forEach((listener) => listener())
}

export function useBookmarks() {
  const bookmarks = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const isSaved = useCallback((id: string) => bookmarks.some((b) => b.id === id), [bookmarks])
  const toggle = useCallback((landmark: Landmark) => {
    const current = getSnapshot()
    setBookmarks(
      current.some((b) => b.id === landmark.id)
        ? current.filter((b) => b.id !== landmark.id)
        : [{ ...landmark, savedAt: new Date().toISOString() }, ...current],
    )
  }, [])
  return { bookmarks, isSaved, toggle }
}
