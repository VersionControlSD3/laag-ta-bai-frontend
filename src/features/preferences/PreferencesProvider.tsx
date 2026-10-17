import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { readJson, writeJson } from '@/lib/storage'
import { DEFAULT_PREFERENCES, PreferencesContext, type Preferences } from './PreferencesContext'

const KEY = 'preferences'

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(() => ({ ...DEFAULT_PREFERENCES, ...readJson(KEY, {}) }))
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const resolvedTheme = prefs.theme === 'system' ? (systemDark ? 'dark' : 'light') : prefs.theme

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
    document.documentElement.lang = prefs.language === 'ceb' ? 'ceb' : 'en'
  }, [resolvedTheme, prefs.language])

  const value = useMemo(
    () => ({
      ...prefs,
      resolvedTheme,
      update(patch: Partial<Preferences>) {
        setPrefs((current) => {
          const next = { ...current, ...patch }
          writeJson(KEY, next)
          return next
        })
      },
    }),
    [prefs, resolvedTheme],
  )

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}
