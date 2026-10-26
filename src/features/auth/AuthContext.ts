import { createContext, useContext } from 'react'

export type AuthUser = { id: string; email: string | null; displayName: string | null }

export type AuthState = {
  /** "supabase" uses Supabase Auth; "dev" is a local-only sign-in for the API's memory mode. */
  mode: 'supabase' | 'dev'
  status: 'loading' | 'signed-in' | 'signed-out'
  user: AuthUser | null
  /** Bearer token for the API. */
  token: string | null
  signIn(email: string, password: string): Promise<void>
  /**
   * `date_of_birth` is intentionally absent: `openapi.yaml` has no such field
   * yet, so it is collected for the age check but not persisted until the
   * API PR lands (CONTRIBUTING #4).
   */
  signUp(input: {
    email: string
    password: string
    displayName: string
    nationality: string
    bio: string
  }): Promise<{ needsConfirmation: boolean }>
  signUpWithGoogle(): Promise<void>
  signInAsDev(displayName?: string): void
  signOut(): Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
