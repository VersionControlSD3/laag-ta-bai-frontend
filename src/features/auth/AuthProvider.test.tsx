import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/AppProviders'
import { readJson, writeJson } from '@/lib/storage'
import { mockFetch } from '@/test/render'
import { EmailTakenError, useAuth } from './AuthContext'
import { AuthProvider } from './AuthProvider'

const signUp = vi.fn()
const session = { access_token: 'token-1', user: { id: 'u1', email: 'gia@example.test', user_metadata: {} } }
let storedSession: typeof session | null = null

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => signUp(...args),
      getSession: () => Promise.resolve({ data: { session: storedSession } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}))

const input = { email: 'taken@example.com', password: 'Secret123', displayName: 'Taken', nationality: 'PH', bio: '' }

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createQueryClient()}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}

async function renderAuth(status: 'signed-in' | 'signed-out' = 'signed-out') {
  const { result } = renderHook(() => useAuth(), { wrapper })
  await waitFor(() => expect(result.current.status).toBe(status))
  return result
}

const patchBodies = (fetch: ReturnType<typeof mockFetch>) =>
  fetch.mock.calls.filter(([, init]) => init?.method === 'PATCH').map(([, init]) => JSON.parse(String(init?.body)))

beforeEach(() => {
  storedSession = null
  signUp.mockReset()
})

/** Fake API: answers POST /v1/auth/email-status and any other call with an empty object. */
function apiWithEmailStatus(registered: boolean | 'down') {
  return mockFetch((url) => {
    if (url.pathname === '/v1/auth/email-status') {
      if (registered === 'down') throw new TypeError('Failed to fetch')
      return { data: { registered } }
    }
    return { data: {} }
  })
}

describe('AuthProvider signUp', () => {
  it('stops before Supabase when the API says the email is taken (bugs #11 and #16)', async () => {
    const fetch = apiWithEmailStatus(true)
    const auth = await renderAuth()

    await expect(auth.current.signUp(input)).rejects.toBeInstanceOf(EmailTakenError)
    // Supabase is never asked, so it sends no "reset your password" email, and nothing is saved for later.
    expect(signUp).not.toHaveBeenCalled()
    expect(readJson('pending-profile', null)).toBeNull()
    const [[url, init]] = fetch.mock.calls
    expect(String(url)).toMatch(/\/v1\/auth\/email-status$/)
    expect(JSON.parse(String(init?.body))).toEqual({ email: 'taken@example.com' })
  })

  it('still rejects a taken email when Supabase reports it (no identities)', async () => {
    apiWithEmailStatus(false)
    signUp.mockResolvedValueOnce({ data: { user: { id: 'x', identities: [] }, session: null }, error: null })
    const auth = await renderAuth()

    await expect(auth.current.signUp(input)).rejects.toBeInstanceOf(EmailTakenError)
    expect(readJson('pending-profile', null)).toBeNull()
  })

  it('signs up as before when the API cannot answer', async () => {
    apiWithEmailStatus('down')
    signUp.mockResolvedValueOnce({ data: { user: { id: 'y', identities: [{ id: 'i' }] }, session: null }, error: null })
    const auth = await renderAuth()

    await expect(auth.current.signUp(input)).resolves.toEqual({ needsConfirmation: true })
    expect(signUp).toHaveBeenCalledTimes(1)
  })

  it('asks a new user to confirm their email', async () => {
    apiWithEmailStatus(false)
    signUp.mockResolvedValueOnce({ data: { user: { id: 'y', identities: [{ id: 'i' }] }, session: null }, error: null })
    const auth = await renderAuth()

    await expect(auth.current.signUp(input)).resolves.toEqual({ needsConfirmation: true })
  })
})

describe('AuthProvider records Terms acceptance for email sign-ups', () => {
  it('saves a pending sign-up profile with acceptTerms once a session exists', async () => {
    storedSession = session
    writeJson('pending-profile', { email: 'Gia@example.test', nationality: 'Filipino', bio: '' })
    const fetch = mockFetch(() => ({ data: {} }))
    await renderAuth('signed-in')
    await waitFor(() => expect(readJson('pending-profile', null)).toBeNull())
    expect(patchBodies(fetch)).toEqual([{ nationality: 'Filipino', bio: '', acceptTerms: true }])
  })

  it('sends acceptTerms with the profile when sign-up returns a session', async () => {
    signUp.mockResolvedValueOnce({ data: { user: { id: 'u1', identities: [{ id: 'i' }] }, session }, error: null })
    const fetch = apiWithEmailStatus(false)
    const auth = await renderAuth()
    await auth.current.signUp({ ...input, nationality: 'Filipino', bio: 'Hi' })
    expect(patchBodies(fetch)).toEqual([{ nationality: 'Filipino', bio: 'Hi', acceptTerms: true }])
  })
})
