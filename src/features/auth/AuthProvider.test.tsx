import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAuth } from './AuthContext'
import { AuthProvider } from './AuthProvider'

const signUp = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => signUp(...args),
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}))

const input = { email: 'taken@example.com', password: 'Secret123', displayName: 'Taken', nationality: 'PH', bio: '' }

async function renderAuth() {
  const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
  await waitFor(() => expect(result.current.status).toBe('signed-out'))
  return result
}

describe('AuthProvider signUp', () => {
  it('rejects an email that already has an account (Supabase returns no identities)', async () => {
    signUp.mockResolvedValueOnce({ data: { user: { id: 'x', identities: [] }, session: null }, error: null })
    const auth = await renderAuth()

    await expect(auth.current.signUp(input)).rejects.toThrow(
      'An account with this email already exists. Please sign in or reset your password.',
    )
  })

  it('asks a new user to confirm their email', async () => {
    signUp.mockResolvedValueOnce({ data: { user: { id: 'y', identities: [{ id: 'i' }] }, session: null }, error: null })
    const auth = await renderAuth()

    await expect(auth.current.signUp(input)).resolves.toEqual({ needsConfirmation: true })
  })
})
