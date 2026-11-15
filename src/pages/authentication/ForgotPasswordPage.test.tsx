import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthState } from '@/features/auth/AuthContext'
import { PreferencesProvider } from '@/features/preferences/PreferencesProvider'
import { writeJson } from '@/lib/storage'
import { routes } from '@/routes'
import { renderRoutes } from '@/test/render'
import ForgotPasswordPage from './ForgotPasswordPage'

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

    expect(screen.getByRole('status')).toHaveTextContent('Your secure reset link is on its way.')
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
