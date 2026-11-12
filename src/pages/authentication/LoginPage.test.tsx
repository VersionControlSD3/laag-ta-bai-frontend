import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/client'
import { AuthContext, type AuthState } from '@/features/auth/AuthContext'
import { PreferencesProvider } from '@/features/preferences/PreferencesProvider'
import { readJson, writeJson } from '@/lib/storage'
import { routes } from '@/routes'
import { mockFetch, renderRoutes } from '@/test/render'
import { signInErrorMessage } from '@/features/auth/signInError'
import LoginPage from './LoginPage'

/** Renders /login with a Supabase-mode auth double, so the real form (not the dev sign-in) shows. */
function renderLogin(overrides: Partial<AuthState> = {}) {
  const auth: AuthState = {
    mode: 'supabase',
    status: 'signed-out',
    user: null,
    token: null,
    signIn: vi.fn().mockResolvedValue(undefined),
    signUp: vi.fn(),
    signInWithGoogle: vi.fn().mockResolvedValue(undefined),
    signInAsDev: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
  }
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/', element: <h1>Explore</h1> },
      { path: '/register', element: <h1>Create Account</h1> },
    ],
    { initialEntries: ['/login'] },
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

describe('login page', () => {
  it('matches the Figma frame: heading, labelled fields, guest and create-account links', () => {
    renderLogin()
    expect(screen.getByRole('heading', { name: 'Log In' })).toBeInTheDocument()
    expect(screen.getByText('Maayong pagbalik')).toHaveAttribute('lang', 'ceb')
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email')
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continue as Guest' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Create Account' })).toHaveAttribute('href', '/register')
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument()
    // Not enabled in Supabase yet, so not offered.
    expect(screen.queryByRole('button', { name: /Facebook|Apple/ })).not.toBeInTheDocument()
  })

  it('explains empty and invalid fields without calling Supabase', async () => {
    const user = userEvent.setup()
    const { auth } = renderLogin()

    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(screen.getByText('Enter your email.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Enter your email.')

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(auth.signIn).not.toHaveBeenCalled()
  })

  it('signs in with Supabase and goes to Explore', async () => {
    const user = userEvent.setup()
    const { auth, router } = renderLogin()

    await user.type(screen.getByLabelText('Email'), '  traveler@example.com ')
    await user.type(screen.getByLabelText('Password'), 'Secret123')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(auth.signIn).toHaveBeenCalledWith('traveler@example.com', 'Secret123')
    expect(await screen.findByRole('heading', { name: 'Explore' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('shows a readable error when the credentials are wrong', async () => {
    const user = userEvent.setup()
    renderLogin({ signIn: vi.fn().mockRejectedValue(new Error('Invalid login credentials')) })

    await user.type(screen.getByLabelText('Email'), 'traveler@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("That email and password don't match.")
    expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled()
  })

  it('toggles password visibility with a labelled 48px button', async () => {
    const user = userEvent.setup()
    renderLogin()

    const toggle = screen.getByRole('button', { name: 'Show password' })
    expect(toggle).toHaveClass('touch-target')
    await user.click(toggle)
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })

  it('starts Google OAuth and reports a failure', async () => {
    const user = userEvent.setup()
    const { auth } = renderLogin({ signInWithGoogle: vi.fn().mockRejectedValue(new Error('Provider is not enabled')) })

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }))
    expect(auth.signInWithGoogle).toHaveBeenCalledOnce()
    expect(await screen.findByRole('alert')).toHaveTextContent('Provider is not enabled')
  })

  it('sends a traveller who is already signed in to Explore', async () => {
    renderLogin({ status: 'signed-in', user: { id: 'u1', email: 'a@b.co', displayName: 'A' } })
    expect(await screen.findByRole('heading', { name: 'Explore' })).toBeInTheDocument()
  })

  it('uses the night photo and darker field wells in dark mode', () => {
    writeJson('preferences', { theme: 'dark' })
    renderLogin()
    const screenRoot = screen.getByRole('heading', { name: 'Log In' }).closest('[data-theme="light"]')
    expect(screenRoot?.className).toContain('LoginNight.webp')
    expect(screen.getByLabelText('Email').parentElement).toHaveClass('bg-navy-pressed/70')
  })
})

/** Real AuthProvider in memory mode (no Supabase keys): email login goes to POST /v1/auth/login. */
describe('login page against the API', () => {
  const loginRoutes = [
    { path: '/login', element: <LoginPage /> },
    { path: '/', element: <h1>Explore</h1> },
  ]

  async function logIn(password: string) {
    const user = userEvent.setup()
    renderRoutes(loginRoutes, '/login')
    await user.type(await screen.findByLabelText('Email'), 'traveler@example.com')
    await user.type(screen.getByLabelText('Password'), password)
    await user.click(screen.getByRole('button', { name: 'Log in' }))
  }

  it('logs in through POST /v1/auth/login and stores the returned session', async () => {
    const fetchSpy = mockFetch(() => ({
      data: {
        user: { id: 'u-42', email: 'traveler@example.com', displayName: 'Traveler' },
        session: { accessToken: 'dev:u-42', tokenType: 'bearer', expiresIn: 3600 },
      },
    }))
    await logIn('Secret123')

    expect(await screen.findByRole('heading', { name: 'Explore' })).toBeInTheDocument()
    const [url, init] = fetchSpy.mock.calls[0]
    expect(String(url)).toBe('http://localhost:3000/v1/auth/login')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ email: 'traveler@example.com', password: 'Secret123' })
    expect(readJson('dev-user', null)).toEqual({ id: 'u-42', email: 'traveler@example.com', displayName: 'Traveler' })
  })

  it("shows the API's 401 as a readable error", async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'unauthorized', message: 'Invalid email or password' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    await logIn('wrong')

    expect(await screen.findByRole('alert')).toHaveTextContent("That email and password don't match.")
    expect(readJson('dev-user', null)).toBeNull()
  })

  it('keeps the dev traveler shortcut when Supabase is not configured', async () => {
    renderRoutes(routes, '/login')
    expect(await screen.findByRole('heading', { name: 'Log In' })).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue as dev traveler' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue with Google' })).not.toBeInTheDocument()
  })
})

describe('signInErrorMessage', () => {
  it('maps API and Supabase errors to traveller copy', () => {
    expect(signInErrorMessage(new ApiError(401, 'unauthorized', 'Invalid email or password'))).toMatch(/don't match/)
    expect(signInErrorMessage(new ApiError(0, 'network_error', "Can't reach the server."))).toMatch(/couldn't reach the server/)
    expect(signInErrorMessage(new Error('Email not confirmed'))).toMatch(/Confirm your email first/)
    expect(signInErrorMessage(new TypeError('Failed to fetch'))).toMatch(/couldn't reach the server/)
    expect(signInErrorMessage(new Error('Something else'))).toBe('Something else')
    expect(signInErrorMessage(null)).toBe('Log in failed. Please try again.')
  })
})
