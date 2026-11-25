import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { ProfileUpdate } from '@/api/types'
import { readJson, removeKey, writeJson } from '@/lib/storage'
import { hasRecoveryCallback, supabase } from '@/lib/supabase'
import { AuthContext, type AuthState, type AuthUser } from './AuthContext'

const DEV_KEY = 'dev-user'
const RECOVERY_SESSION_KEY = 'password-recovery-session'
/** Profile fields captured at sign-up but not yet saved (email confirmation is on). */
const PENDING_PROFILE_KEY = 'pending-profile'

type PendingProfile = ProfileUpdate & { email: string }

function fromSession(session: Session | null): AuthUser | null {
  if (!session) return null
  const meta = session.user.user_metadata as { display_name?: string } | undefined
  return { id: session.user.id, email: session.user.email ?? null, displayName: meta?.display_name ?? null }
}

// Supabase keeps the session ID stable when it refreshes the access token.
function getSessionId(session: Session | null): string | null {
  const payload = session?.access_token.split('.')[1]
  if (!payload) return null
  try {
    const { session_id } = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return typeof session_id === 'string' && session_id ? session_id : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [recoverySessionId, setRecoverySessionId] = useState<string | null>(null)
  const [devUser, setDevUser] = useState<AuthUser | null>(() => (supabase ? null : readJson<AuthUser | null>(DEV_KEY, null)))
  const [loading, setLoading] = useState(Boolean(supabase))
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!supabase) return
    let active = true
    let receivedAuthEvent = false
    let recoveryId = readJson<string | null>(RECOVERY_SESSION_KEY, null)
    let recoveryEventReceived = false
    let recoveryTimer: ReturnType<typeof setTimeout> | undefined

    const syncSession = (next: Session | null, event?: AuthChangeEvent) => {
      const sessionId = getSessionId(next)
      if (event === 'PASSWORD_RECOVERY') {
        recoveryId = sessionId
        if (recoveryId) writeJson(RECOVERY_SESSION_KEY, recoveryId)
        else removeKey(RECOVERY_SESSION_KEY)
      } else if (event === 'SIGNED_OUT' || event === 'USER_UPDATED' || recoveryId !== sessionId) {
        if (recoveryId) removeKey(RECOVERY_SESSION_KEY)
        recoveryId = null
      }
      setRecoverySessionId(recoveryId)
      setSession(next)
    }

    // getSession validates the stored session and refreshes expired tokens (SRS 3.5.2.2).
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      if (!receivedAuthEvent) syncSession(data.session)
      if (hasRecoveryCallback && !recoveryEventReceived) {
        recoveryTimer = setTimeout(() => { if (active) setLoading(false) }, 5000)
      } else {
        setLoading(false)
      }
    }).catch(() => {
      if (active) setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return
      receivedAuthEvent = true
      syncSession(next, event)
      if (event === 'PASSWORD_RECOVERY') {
        recoveryEventReceived = true
        clearTimeout(recoveryTimer)
        setLoading(false)
      }
    })
    return () => {
      active = false
      clearTimeout(recoveryTimer)
      data.subscription.unsubscribe()
    }
  }, [])

  // nationality/bio are Profile fields (PATCH /v1/me), not auth metadata. Save
  // them once a session exists: right after sign-up, or after the confirmation
  // email when Supabase returns no session yet (PR #17 review).
  useEffect(() => {
    if (!session) return
    const pending = readJson<PendingProfile | null>(PENDING_PROFILE_KEY, null)
    if (!pending) return
    if (pending.email.toLowerCase() !== (session.user.email ?? '').toLowerCase()) return
    // A pending profile only comes from the sign-up form, which requires the Terms checkbox.
    api
      .updateMe({ nationality: pending.nationality, bio: pending.bio, acceptTerms: true }, session.access_token)
      .then(() => {
        removeKey(PENDING_PROFILE_KEY)
        // ProfileGate may already have read a profile without terms and sent the user to /complete-profile.
        void queryClient.invalidateQueries({ queryKey: ['me'] })
      })
      .catch(() => {
        // Keep it: retried on the next sign-in / token refresh.
      })
  }, [session, queryClient])

  const value = useMemo<AuthState>(() => {
    const user = supabase ? fromSession(session) : devUser
    return {
      mode: supabase ? 'supabase' : 'dev',
      status: loading ? 'loading' : user ? 'signed-in' : 'signed-out',
      user,
      token: supabase ? (session?.access_token ?? null) : devUser ? `dev:${devUser.id}` : null,
      isPasswordRecovery: recoverySessionId !== null && recoverySessionId === getSessionId(session),
      async signIn(email, password) {
        // POST /v1/auth/login (API #7). The API signs in with Supabase, or checks its in-memory
        // accounts in memory mode and issues a `dev:<id>` token.
        const { user, session: issued } = await api.login({ email, password })
        if (!issued) throw new Error('Email not confirmed')
        if (supabase) {
          if (!issued.refreshToken) throw new Error('The server did not return a refresh token. Please try again.')
          // Hand the tokens to the Supabase client so it persists and refreshes the session;
          // onAuthStateChange then updates `session`.
          const { error } = await supabase.auth.setSession({
            access_token: issued.accessToken,
            refresh_token: issued.refreshToken,
          })
          if (error) throw error
          return
        }
        const next = { id: user.id, email: user.email, displayName: user.displayName }
        writeJson(DEV_KEY, next)
        setDevUser(next)
      },
      async signUp({ email, password, displayName, nationality, bio }) {
        if (!supabase) throw new Error('Supabase is not configured. Use the dev sign-in.')
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Only display_name belongs here: the API reads it when it creates
            // the profile row. nationality/bio go to PATCH /v1/me below.
            // date_of_birth is used only for the 18+ age check at sign-up and is not stored or sent to the API (DPA proportionality).
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        })
        if (error) throw error
        // With email confirmation on, Supabase hides taken emails: it returns a user with no identities instead of an error.
        if (data.user && data.user.identities?.length === 0) {
          throw new Error('An account with this email already exists. Please sign in or reset your password.')
        }
        if (!data.session) {
          // No session until the email is confirmed; save the profile then.
          writeJson(PENDING_PROFILE_KEY, { email, nationality, bio })
          return { needsConfirmation: true }
        }
        await api.updateMe({ nationality, bio, acceptTerms: true }, data.session.access_token).catch(() => {
          writeJson(PENDING_PROFILE_KEY, { email, nationality, bio })
        })
        return { needsConfirmation: false }
      },
      async resendConfirmationEmail(email) {
        if (!supabase) throw new Error('Supabase is not configured. Use the dev sign-in.')
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email,
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) throw error
      },
      async signInWithGoogle() {
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
  }, [session, devUser, loading, recoverySessionId])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
