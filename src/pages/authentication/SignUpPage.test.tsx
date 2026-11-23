import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthState } from '@/features/auth/AuthContext'
import { PreferencesProvider } from '@/features/preferences/PreferencesProvider'
import { writeJson } from '@/lib/storage'
import { routes } from '@/routes'
import { renderRoutes } from '@/test/render'
import SignUpPage from './SignUpPage'

async function openRegister() {
  renderRoutes(routes, '/register')
  return await screen.findByRole('heading', { name: 'Create Account' })
}

/** Renders /register with a Supabase-mode auth double, so Continue with Google is enabled. */
function renderSupabaseRegister() {
  const auth = {
    mode: 'supabase', status: 'signed-out', user: null, token: null,
    signIn: vi.fn(), signUp: vi.fn(), signInWithGoogle: vi.fn().mockResolvedValue(undefined), signInAsDev: vi.fn(), signOut: vi.fn(),
  } satisfies AuthState
  const router = createMemoryRouter([{ path: '/register', element: <SignUpPage /> }], { initialEntries: ['/register'] })
  render(<PreferencesProvider><AuthContext.Provider value={auth}><RouterProvider router={router} /></AuthContext.Provider></PreferencesProvider>)
  return auth
}

describe('sign-up page', () => {
  it('blocks Continue with Google until the Terms are accepted and an 18+ date of birth is set', async () => {
    const user = userEvent.setup()
    const auth = renderSupabaseRegister()
    const google = screen.getByRole('button', { name: 'Continue with Google' })

    await user.click(google)
    expect(auth.signInWithGoogle).not.toHaveBeenCalled()
    expect(screen.getByText('Date of birth is required.')).toBeInTheDocument()
    expect(screen.getByText('You must accept the Terms and Privacy Policy.')).toBeInTheDocument()
    expect(screen.getByText(/before continuing with Google/)).toBeInTheDocument()
    // Only the consent fields are flagged, not the email/password form.
    expect(screen.queryByText('Full name is required.')).not.toBeInTheDocument()

    const dateOfBirth = document.querySelector<HTMLInputElement>('input[name="dateOfBirth"]')!
    fireEvent.change(dateOfBirth, { target: { value: `${new Date().getFullYear() - 16}-05-15` } })
    await user.click(screen.getByRole('checkbox'))
    await user.click(google)
    expect(auth.signInWithGoogle).not.toHaveBeenCalled()
    expect(screen.getByText('You must be at least 18 to create an account.')).toBeInTheDocument()

    fireEvent.change(dateOfBirth, { target: { value: `${new Date().getFullYear() - 20}-05-15` } })
    // The hint clears as soon as both fields are valid, not on the next click.
    expect(screen.queryByText(/before continuing with Google/)).not.toBeInTheDocument()
    await user.click(google)
    expect(auth.signInWithGoogle).toHaveBeenCalledOnce()
    expect(screen.queryByText(/before continuing with Google/)).not.toBeInTheDocument()
  })

  it('shows the required-field errors when the empty form is submitted', async () => {
    const user = userEvent.setup()
    await openRegister()

    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Full name is required.')).toBeInTheDocument()
    expect(screen.getByText('Email is required.')).toBeInTheDocument()
    expect(screen.getByText('Date of birth is required.')).toBeInTheDocument()
    expect(screen.getByText('Nationality is required.')).toBeInTheDocument()
    expect(screen.getByText('You must accept the Terms and Privacy Policy.')).toBeInTheDocument()
  })

  it('tracks password rules and the confirmation match as you type', async () => {
    const user = userEvent.setup()
    await openRegister()

    const [password, confirmation] = document.querySelectorAll<HTMLInputElement>('input[autocomplete="new-password"]')
    await user.type(password, 'Secret')

    expect(screen.getByText('At least 8 characters')).not.toHaveClass('text-sage-deep')
    expect(screen.getByText('One uppercase letter')).toHaveClass('text-sage-deep')
    expect(screen.getByText('One number')).not.toHaveClass('text-sage-deep')

    await user.type(password, '123')
    expect(screen.getByText('At least 8 characters')).toHaveClass('text-sage-deep')
    expect(screen.getByText('One number')).toHaveClass('text-sage-deep')

    await user.type(confirmation, 'Secret124')
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument()
    // Exactly one border state, so the mismatch colour can't lose to the neutral border.
    expect(confirmation).toHaveClass('border-danger')
    expect(confirmation).not.toHaveClass('border-ivory-line')
    await user.clear(confirmation)
    await user.type(confirmation, 'Secret123')
    expect(await screen.findByText('Passwords match')).toBeInTheDocument()
    expect(confirmation).toHaveClass('border-sage-deep')
    expect(confirmation).not.toHaveClass('border-ivory-line')
    expect(confirmation).not.toHaveClass('border-danger')
  })

  it('opens the calendar on the 18-years-ago default with unique weekday headers', async () => {
    const user = userEvent.setup()
    await openRegister()

    await user.click(screen.getByRole('button', { name: 'Choose date of birth' }))
    const dialog = await screen.findByRole('dialog', { name: 'Choose date of birth' })
    const now = new Date()

    expect(within(dialog).getByRole('button', { name: 'Year' })).toHaveTextContent(String(now.getFullYear() - 18))

    const labels = Array.from(dialog.querySelectorAll('.auth-calendar-weekday')).map((cell) => cell.textContent)
    expect(labels).toEqual(['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'])
    expect(new Set(labels).size).toBe(7)
  })

  it('enforces 18+ minimum age in the picker: ends year list at 18 years ago and disables underage days', async () => {
    const user = userEvent.setup()
    await openRegister()

    await user.click(screen.getByRole('button', { name: 'Choose date of birth' }))
    const dialog = await screen.findByRole('dialog', { name: 'Choose date of birth' })
    const now = new Date()
    const maxYear = now.getFullYear() - 18

    // The default view is this month, 18 years ago: Next month is disabled
    expect(within(dialog).getByRole('button', { name: 'Next month' })).toBeDisabled()

    // The year list ends at today minus 18 years (no underage years available)
    await user.click(within(dialog).getByRole('button', { name: 'Year' }))
    expect(within(dialog).queryByRole('option', { name: String(now.getFullYear()) })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('option', { name: String(now.getFullYear() - 17) })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('option', { name: String(maxYear) })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Year' }))

    const dayCells = within(dialog).getAllByRole('gridcell')
    const underageDays = dayCells.filter((cell) => Number(cell.textContent) > now.getDate())
    const daysInMonth = new Date(maxYear, now.getMonth() + 1, 0).getDate()
    if (now.getDate() < daysInMonth) expect(underageDays.length).toBeGreaterThan(0)
    for (const cell of underageDays) expect(cell).toBeDisabled()

    // The old "Today" action set a birth date of today; only Clear remains.
    expect(within(dialog).queryByRole('button', { name: 'Today' })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Clear' })).toBeInTheDocument()
  })

  it('shows 18+ requirement error when an underage date is submitted', async () => {
    const user = userEvent.setup()
    await openRegister()

    const now = new Date()
    const underageDate = `${now.getFullYear() - 16}-05-15`
    const hiddenInput = document.querySelector<HTMLInputElement>('input[name="dateOfBirth"]')!
    fireEvent.change(hiddenInput, { target: { value: underageDate } })

    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('You must be at least 18 to create an account.')).toBeInTheDocument()
  })

  it('keeps the selected month when the calendar is reopened', async () => {
    const user = userEvent.setup()
    await openRegister()

    await user.click(screen.getByRole('button', { name: 'Choose date of birth' }))
    let dialog = await screen.findByRole('dialog', { name: 'Choose date of birth' })
    const now = new Date()
    await user.click(within(dialog).getByRole('button', { name: 'Year' }))
    await user.click(await within(dialog).findByRole('option', { name: String(now.getFullYear() - 19) }))
    const pastDay = within(dialog).getAllByRole('gridcell')[0]
    await user.click(pastDay)
    expect(screen.getByRole('button', { name: 'Choose date of birth' })).not.toHaveTextContent('mm/dd/yyyy')

    // Reopening keeps the chosen month instead of jumping back to today.
    await user.click(screen.getByRole('button', { name: 'Choose date of birth' }))
    dialog = await screen.findByRole('dialog', { name: 'Choose date of birth' })
    expect(within(dialog).getByRole('button', { name: 'Year' })).toHaveTextContent(String(now.getFullYear() - 19))
  })

  it('uses the night photo when the Dark preference is on', async () => {
    writeJson('preferences', { theme: 'dark' })
    const { container } = renderRoutes(routes, '/register')
    expect(await screen.findByRole('heading', { name: 'Create Account' })).toBeInTheDocument()
    expect(container.querySelector('img')).toHaveAttribute('src', '/authenticationBG/LoginNight.webp')
  })

  it('uses the day photo when the Light preference is on', async () => {
    writeJson('preferences', { theme: 'light' })
    const { container } = renderRoutes(routes, '/register')
    expect(await screen.findByRole('heading', { name: 'Create Account' })).toBeInTheDocument()
    expect(container.querySelector('img')).toHaveAttribute('src', '/authenticationBG/LoginDay.webp')
  })

  it('renders the dev sign-in notice with an explicit text colour', async () => {
    await openRegister()
    const notice = await screen.findByText("Supabase isn't configured.")
    expect(notice.closest('div')).toHaveClass('text-ink')
    expect(screen.getByRole('button', { name: 'Continue as dev traveler' })).toBeInTheDocument()
  })

  it('links Terms and Privacy Policy in a new tab so the form is not lost', async () => {
    await openRegister()

    for (const [name, href] of [
      ['Terms', '/terms'],
      ['Privacy Policy', '/privacy'],
    ] as const) {
      const link = screen.getByRole('link', { name })
      expect(link).toHaveAttribute('href', href)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
    }
  })

  it('renders the Terms route instead of the 404 page and includes the 18+ requirement', async () => {
    renderRoutes(routes, '/terms')
    expect(await screen.findByRole('heading', { name: 'Terms of Use' })).toBeInTheDocument()
    expect(screen.getByText(/18 years of age or older/i)).toBeInTheDocument()
    expect(screen.queryByText(/This page doesn't exist/)).not.toBeInTheDocument()
  })

  it('renders the Privacy route instead of the 404 page and clarifies DOB is not stored', async () => {
    renderRoutes(routes, '/privacy')
    expect(await screen.findByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument()
    expect(screen.getByText(/18 or older/i)).toBeInTheDocument()
    expect(screen.getByText(/not stored or sent to our servers/i)).toBeInTheDocument()
    expect(screen.queryByText(/This page doesn't exist/)).not.toBeInTheDocument()
  })
})
