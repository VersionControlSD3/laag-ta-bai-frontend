import { useContext } from 'react'
import { PreferencesContext } from '@/features/preferences/PreferencesContext'
import { archives } from './messages/archives'
import { auth } from './messages/auth'
import { chat } from './messages/chat'
import { common } from './messages/common'
import { explore } from './messages/explore'
import { landmark } from './messages/landmark'
import { legal } from './messages/legal'
import { mastery } from './messages/mastery'
import { onboarding } from './messages/onboarding'
import { profile } from './messages/profile'
import { scan } from './messages/scan'
import type { Language } from './types'

export type { Language } from './types'

const namespaces = { archives, auth, chat, common, explore, landmark, legal, mastery, onboarding, profile, scan }
type Namespaces = typeof namespaces

export type Messages = { [K in keyof Namespaces]: Namespaces[K]['en'] }

function build(language: Language): Messages {
  return Object.fromEntries(Object.entries(namespaces).map(([key, ns]) => [key, ns[language]])) as Messages
}

export const MESSAGES: Record<Language, Messages> = { en: build('en'), ceb: build('ceb') }

/** BCP 47 tag for `Intl` formatting; browsers without Cebuano data fall back to Filipino English. */
export const LOCALES: Record<Language, string[]> = { en: ['en-PH'], ceb: ['ceb-PH', 'en-PH'] }

/** Messages for the current app language (Profile → Language). Works outside the provider too (English). */
export function useT(): Messages {
  return MESSAGES[useContext(PreferencesContext)?.language ?? 'en']
}

export function useLanguage(): Language {
  return useContext(PreferencesContext)?.language ?? 'en'
}
