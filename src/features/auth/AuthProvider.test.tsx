import { render, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/AppProviders'
import { readJson, writeJson } from '@/lib/storage'
import { mockFetch } from '@/test/render'
import { useAuth, type AuthState } from './AuthContext'
import { AuthProvider } from './AuthProvider'

const session = { access_token: 'token-1', user: { id: 'u1', email: 'gia@example.test', user_metadata: {} } }

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signUp: async () => ({ data: { session }, error: null }),
    },
  },
}))

function renderProvider() {
  const auth: { current: AuthState | null } = { current: null }
  function Probe() {
    auth.current = useAuth()
    return null
  }
  render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  )
  return auth
}

const patchBodies = (fetch: ReturnType<typeof mockFetch>) =>
  fetch.mock.calls.filter(([, init]) => init?.method === 'PATCH').map(([, init]) => JSON.parse(String(init?.body)))

describe('AuthProvider records Terms acceptance for email sign-ups', () => {
  it('saves a pending sign-up profile with acceptTerms once a session exists', async () => {
    writeJson('pending-profile', { email: 'Gia@example.test', nationality: 'Filipino', bio: '' })
    const fetch = mockFetch(() => ({ data: {} }))
    renderProvider()
    await waitFor(() => expect(readJson('pending-profile', null)).toBeNull())
    expect(patchBodies(fetch)).toEqual([{ nationality: 'Filipino', bio: '', acceptTerms: true }])
  })

  it('sends acceptTerms with the profile when sign-up returns a session', async () => {
    const fetch = mockFetch(() => ({ data: {} }))
    const auth = renderProvider()
    await waitFor(() => expect(auth.current?.status).toBe('signed-in'))
    await auth.current!.signUp({ email: 'gia@example.test', password: 'Secret123', displayName: 'Gia', nationality: 'Filipino', bio: 'Hi' })
    expect(patchBodies(fetch)).toEqual([{ nationality: 'Filipino', bio: 'Hi', acceptTerms: true }])
  })
})
