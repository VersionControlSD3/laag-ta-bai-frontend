import { createContext, useContext } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

export type Preferences = {
  theme: ThemeMode
  language: 'en' | 'ceb'
  proximityAlerts: boolean
  streakReminders: boolean
  questNotices: boolean
  onboarded: boolean
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  language: 'en',
  proximityAlerts: true,
  streakReminders: true,
  questNotices: true,
  onboarded: false,
}

export type PreferencesState = Preferences & {
  resolvedTheme: 'light' | 'dark'
  update(patch: Partial<Preferences>): void
}

export const PreferencesContext = createContext<PreferencesState | null>(null)

export function usePreferences(): PreferencesState {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used inside <PreferencesProvider>')
  return ctx
}
