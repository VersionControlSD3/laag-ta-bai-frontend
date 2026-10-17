import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { readJson, removeKey, writeJson } from '@/lib/storage'
import { supabase } from '@/lib/supabase'
import { AuthContext, type AuthState, type AuthUser } from './AuthContext'

const DEV_KEY = 'dev-user'

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
      async signUp({ email, password, displayName }) {
        if (!supabase) throw new Error('Supabase is not configured. Use the dev sign-in.')
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName }, emailRedirectTo: window.location.origin },
        })
        if (error) throw error
        return { needsConfirmation: !data.session }
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
