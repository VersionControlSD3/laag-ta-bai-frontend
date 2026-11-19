import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { AuthContext, type AuthState } from '@/features/auth/AuthContext'
import { PreferencesProvider } from '@/features/preferences/PreferencesProvider'
import { writeJson } from '@/lib/storage'
import { routes } from '@/routes'
import { renderRoutes } from '@/test/render'
import ForgotPasswordPage from './ForgotPasswordPage'

const { supabaseAuth } = vi.hoisted(() => ({
  supabaseAuth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    updateUser: vi.fn().mockResolvedValue({ error: null }),
  },
}))

vi.mock('@/lib/supabase', () => ({ supabase: { auth: supabaseAuth } }))

function renderForgotPassword(overrides: Partial<AuthState> = {}) {
  const auth: AuthState = {
    mode: 'supabase',
    status: 'signed-out',
    user: null,
    token: null,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signInWithGoogle: vi.fn(),
    signInAsDev: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
  }
  const router = createMemoryRouter(
    [
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/', element: <h1>Explore</h1> },
    ],
    { initialEntries: ['/forgot-password'] },
  )
  render(
    <PreferencesProvider>
      <AuthContext.Provider value={auth}>
        <RouterProvider router={router} />
      </AuthContext.Provider>
    </PreferencesProvider>,
  )
  return { auth, router }
}

describe('forgot password page', () => {
  it('matches the Figma frame: heading, description, labelled email field, and submit button', () => {
    renderForgotPassword()
    expect(screen.getByRole('heading', { name: 'Forgot Password?' })).toBeInTheDocument()
    expect(screen.getByText("Enter your email and we'll send you a secure reset link.")).toBeInTheDocument()
    expect(screen.getByText('Cebu, Philippines')).toBeInTheDocument()
    const emailInput = screen.getByLabelText('Email')
    expect(emailInput).toHaveAttribute('type', 'email')
    expect(emailInput).toHaveAttribute('autocomplete', 'email')
    expect(emailInput).toHaveAttribute('placeholder', 'explorer@example.com')
    expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeInTheDocument()
  })

  it('validates empty and invalid email addresses and clears the error on edit', async () => {
    const user = userEvent.setup()
    renderForgotPassword()

    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter your email address.')
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid email address.')
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('submits a valid email and shows the reset link confirmation status', async () => {
    const user = userEvent.setup()
    renderForgotPassword()

    await user.type(screen.getByLabelText('Email'), '  explorer@example.com  ')
    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Your secure reset link is on its way.')
    expect(supabaseAuth.resetPasswordForEmail).toHaveBeenCalledWith('explorer@example.com', {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'false')
  })

  it('uses LoginDay.webp and lighter field wells in light mode', () => {
    writeJson('preferences', { theme: 'light' })
    renderForgotPassword()
    const screenRoot = screen.getByRole('heading', { name: 'Forgot Password?' }).closest('[data-theme="light"]')
    expect(screenRoot?.className).toContain('LoginDay.webp')
    expect(screen.getByLabelText('Email').parentElement).toHaveClass('bg-navy-pressed/35')
  })

  it('uses LoginNight.webp and darker field wells in dark mode', () => {
    writeJson('preferences', { theme: 'dark' })
    renderForgotPassword()
    const screenRoot = screen.getByRole('heading', { name: 'Forgot Password?' }).closest('[data-theme="light"]')
    expect(screenRoot?.className).toContain('LoginNight.webp')
    expect(screen.getByLabelText('Email').parentElement).toHaveClass('bg-navy-pressed/70')
  })

  it('sends a traveller who is already signed in to Explore', async () => {
    renderForgotPassword({ status: 'signed-in', user: { id: 'u1', email: 'a@b.co', displayName: 'A' } })
    expect(await screen.findByRole('heading', { name: 'Explore' })).toBeInTheDocument()
  })

  it('renders at the /forgot-password app route', async () => {
    renderRoutes(routes, '/forgot-password')
    expect(await screen.findByRole('heading', { name: 'Forgot Password?' })).toBeInTheDocument()
  })
})

describe('reset password route', () => {
  const session = {
    user: { id: 'traveler' },
    access_token: `header.${btoa(JSON.stringify({ session_id: 'recovery-session' }))}.signature`,
  } as Session

  it('restores recovery after a reload and saves the confirmed password', async () => {
    const user = userEvent.setup()
    supabaseAuth.getSession.mockResolvedValueOnce({ data: { session } })
    const original = renderRoutes(routes, '/reset-password')

    expect(await screen.findByText('This reset link is invalid or expired.')).toBeInTheDocument()
    expect(screen.queryByLabelText('New password', { exact: true })).not.toBeInTheDocument()

    const notify = supabaseAuth.onAuthStateChange.mock.lastCall?.[0] as (event: AuthChangeEvent, session: Session) => void
    act(() => notify('PASSWORD_RECOVERY', session))
    expect(screen.getByLabelText('New password', { exact: true })).toBeInTheDocument()

    original.unmount()
    const refreshed = { ...session, access_token: session.access_token.replace('.signature', '.refreshed') }
    supabaseAuth.getSession.mockResolvedValueOnce({ data: { session: refreshed } })
    renderRoutes(routes, '/reset-password')

    await user.type(await screen.findByLabelText('New password', { exact: true }), 'NewPassword123')
    const confirmation = screen.getByLabelText('Confirm new password')
    await user.type(confirmation, 'DifferentPassword123')
    await user.click(screen.getByRole('button', { name: 'Update Password' }))
    expect(screen.getByRole('alert')).toHaveTextContent('The passwords must match.')
    expect(supabaseAuth.updateUser).not.toHaveBeenCalled()

    await user.clear(confirmation)
    await user.type(confirmation, 'NewPassword123')
    await user.click(screen.getByRole('button', { name: 'Update Password' }))
    expect(supabaseAuth.updateUser).toHaveBeenCalledWith({ password: 'NewPassword123' })
    expect(await screen.findByRole('status')).toHaveTextContent('Your password has been updated.')
  })

  it('rejects a different session for the same account', async () => {
    writeJson('password-recovery-session', 'recovery-session')
    const other = {
      ...session,
      access_token: `header.${btoa(JSON.stringify({ session_id: 'ordinary-session' }))}.signature`,
    }
    supabaseAuth.getSession.mockResolvedValueOnce({ data: { session: other } })
    renderRoutes(routes, '/reset-password')

    expect(await screen.findByText('This reset link is invalid or expired.')).toBeInTheDocument()
    expect(screen.queryByLabelText('New password', { exact: true })).not.toBeInTheDocument()
  })
})
