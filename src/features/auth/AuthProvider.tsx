import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { api } from '@/api/client'
import type { ProfileUpdate } from '@/api/types'
import { readJson, removeKey, writeJson } from '@/lib/storage'
import { supabase } from '@/lib/supabase'
import { AuthContext, type AuthState, type AuthUser } from './AuthContext'

const DEV_KEY = 'dev-user'
/** Profile fields captured at sign-up but not yet saved (email confirmation is on). */
const PENDING_PROFILE_KEY = 'pending-profile'

type PendingProfile = ProfileUpdate & { email: string }

function fromSession(session: Session | null): AuthUser | null {
  if (!session) return null
  const meta = session.user.user_metadata as { display_name?: string } | undefined
  return { id: session.user.id, email: session.user.email ?? null, displayName: meta?.display_name ?? null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [devUser, setDevUser] = useState<AuthUser | null>(() => (supabase ? null : readJson<AuthUser | null>(DEV_KEY, null)))
  const [loading, setLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return
    // getSession validates the stored session and refreshes expired tokens (SRS 3.5.2.2).
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  // nationality/bio are Profile fields (PATCH /v1/me), not auth metadata. Save
  // them once a session exists: right after sign-up, or after the confirmation
  // email when Supabase returns no session yet (PR #17 review).
  useEffect(() => {
    if (!session) return
    const pending = readJson<PendingProfile | null>(PENDING_PROFILE_KEY, null)
    if (!pending) return
    if (pending.email.toLowerCase() !== (session.user.email ?? '').toLowerCase()) return
    api
      .updateMe({ nationality: pending.nationality, bio: pending.bio }, session.access_token)
      .then(() => removeKey(PENDING_PROFILE_KEY))
      .catch(() => {
        // Keep it: retried on the next sign-in / token refresh.
      })
  }, [session])

  const value = useMemo<AuthState>(() => {
    const user = supabase ? fromSession(session) : devUser
    return {
      mode: supabase ? 'supabase' : 'dev',
      status: loading ? 'loading' : user ? 'signed-in' : 'signed-out',
      user,
      token: supabase ? (session?.access_token ?? null) : devUser ? `dev:${devUser.id}` : null,
      async signIn(email, password) {
        if (!supabase) throw new Error('Supabase is not configured. Use the dev sign-in.')
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      },
      async signUp({ email, password, displayName, nationality, bio }) {
        if (!supabase) throw new Error('Supabase is not configured. Use the dev sign-in.')
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Only display_name belongs here: the API reads it when it creates
            // the profile row. nationality/bio go to PATCH /v1/me below, and
            // date_of_birth is not in openapi.yaml yet (CONTRIBUTING #4).
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        })
        if (error) throw error
        if (!data.session) {
          // No session until the email is confirmed; save the profile then.
          writeJson(PENDING_PROFILE_KEY, { email, nationality, bio })
          return { needsConfirmation: true }
        }
        await api.updateMe({ nationality, bio }, data.session.access_token).catch(() => {
          writeJson(PENDING_PROFILE_KEY, { email, nationality, bio })
        })
        return { needsConfirmation: false }
      },
      async signUpWithGoogle() {
        if (!supabase) throw new Error('Supabase is not configured. Use the dev sign-in.')
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/` },
        })
        if (error) throw error
      },
      signInAsDev(displayName = 'Dev Traveler') {
        const next = { id: 'local-dev-user', email: null, displayName }
        writeJson(DEV_KEY, next)
        setDevUser(next)
      },
      async signOut() {
        if (supabase) await supabase.auth.signOut()
        removeKey(DEV_KEY)
        setDevUser(null)
      },
    }
  }, [session, devUser, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
