import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, EmailTakenError, type AuthState } from '@/features/auth/AuthContext'
import { writeJson } from '@/lib/storage'
import { routes } from '@/routes'
import { renderPage, renderRoutes } from '@/test/render'
import SignUpPage from './SignUpPage'

async function openRegister() {
  renderRoutes(routes, '/register')
  return await screen.findByRole('heading', { name: 'Create Account' }, { timeout: 3000 })
}

async function selectAdultBirthDate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Choose date of birth' }))
  const dialog = within(screen.getByRole('dialog', { name: 'Choose date of birth' }))
  await user.click(dialog.getByRole('button', { name: 'Year' }))
  await user.click(dialog.getByRole('option', { name: '1990' }))
  await user.click(dialog.getByRole('button', { name: 'Month' }))
  await user.click(dialog.getByRole('option', { name: 'January' }))
  await user.click(dialog.getByRole('gridcell', { name: '1' }))
}

/** A Supabase-mode auth double (Continue with Google is enabled); override only what a test checks. */
function supabaseAuth(overrides: Partial<AuthState> = {}): AuthState {
  return {
    mode: 'supabase',
    status: 'signed-out',
    user: null,
    token: null,
    signIn: vi.fn(),
    signUp: vi.fn().mockResolvedValue({ needsConfirmation: true }),
    resendConfirmationEmail: vi.fn().mockResolvedValue(undefined),
    signInWithGoogle: vi.fn().mockResolvedValue(undefined),
    signInAsDev: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
  }
}

async function fillAndSubmitValidForm(user: ReturnType<typeof userEvent.setup>, email = 'traveler@example.com') {
  fireEvent.change(screen.getByRole('textbox', { name: 'Full name' }), { target: { value: 'Juan Dela Cruz' } })
  fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: email } })
  const hiddenDob = document.querySelector<HTMLInputElement>('input[name="dateOfBirth"]')!
  fireEvent.change(hiddenDob, { target: { value: '1998-06-15' } })
  fireEvent.change(screen.getByRole('combobox', { name: 'Nationality' }), { target: { value: 'Filipino' } })
  const [password, confirm] = document.querySelectorAll<HTMLInputElement>('input[autocomplete="new-password"]')
  fireEvent.change(password, { target: { value: 'Secret123' } })
  fireEvent.change(confirm, { target: { value: 'Secret123' } })
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: 'Create account' }))
}

describe('sign-up page', () => {
  it('shows the required-field errors when the empty form is submitted', async () => {
    const user = userEvent.setup()
    await openRegister()
    const fullName = screen.getByRole('textbox', { name: 'Full name' })
    const scrollIntoView = vi.fn()
    Object.defineProperty(fullName, 'scrollIntoView', { value: scrollIntoView })

    const nationality = screen.getByRole('combobox', { name: 'Nationality' })
    expect(within(nationality).getByRole('option', { name: 'Japanese' })).toBeInTheDocument()
    expect(within(nationality).queryByRole('option', { name: 'Japan' })).not.toBeInTheDocument()
    expect(within(nationality).queryByRole('option', { name: 'Philippines' })).not.toBeInTheDocument()
    await user.type(nationality, '12345')
    expect(nationality).toHaveValue('')

    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(fullName).toHaveFocus()
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' })
    expect(fullName).toHaveAccessibleDescription('Full name is required.')
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAccessibleDescription('Email is required.')
    expect(screen.getByLabelText(/^Date of birth/)).toHaveAccessibleDescription('Date of birth is required.')
    expect(nationality).toHaveAccessibleDescription('Nationality is required.')
    expect(screen.getByLabelText(/^Password\b/)).toHaveAccessibleDescription(/One uppercase letter: required/)
    expect(screen.getByLabelText(/^Confirm password\b/)).toHaveAccessibleDescription('Please confirm your password.')
    expect(screen.getByRole('checkbox')).toHaveAccessibleDescription('You must accept the Terms and Privacy Policy.')

    await user.selectOptions(nationality, 'Filipino')
    expect(nationality).toHaveValue('Filipino')
    expect(screen.queryByText('Nationality is required.')).not.toBeInTheDocument()
  })

  it('focuses the first remaining invalid control on each submit', async () => {
    const user = userEvent.setup()
    await openRegister()
    const submit = screen.getByRole('button', { name: 'Create account' })
    const datePicker = screen.getByLabelText(/^Date of birth/)
    const [password, confirmation] = document.querySelectorAll<HTMLInputElement>('input[autocomplete="new-password"]')

    fireEvent.change(screen.getByRole('textbox', { name: 'Full name' }), { target: { value: 'Test Traveler' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'traveler@example.com' } })
    await user.click(submit)
    expect(datePicker).toHaveFocus()

    await selectAdultBirthDate(user)
    fireEvent.change(screen.getByRole('combobox', { name: 'Nationality' }), { target: { value: 'Filipino' } })
    fireEvent.change(password, { target: { value: 'Secret123' } })
    await user.click(submit)
    expect(confirmation).toHaveFocus()
    expect(confirmation).toHaveAccessibleDescription('Please confirm your password.')

    fireEvent.change(confirmation, { target: { value: 'Secret123' } })
    expect(screen.queryByText('Please confirm your password.')).not.toBeInTheDocument()
    await user.click(submit)
    expect(screen.getByRole('checkbox')).toHaveFocus()
  })

  it('says an already-registered email exists and links to Sign in, instead of the confirmation screen (bug #16)', async () => {
    const user = userEvent.setup()
    const auth = supabaseAuth({ signUp: vi.fn().mockRejectedValue(new EmailTakenError()) })
    renderPage(
      <AuthContext.Provider value={auth}>
        <SignUpPage />
      </AuthContext.Provider>,
      '/register',
    )
    await fillAndSubmitValidForm(user, 'taken@example.com')

    const email = screen.getByRole('textbox', { name: 'Email' })
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Email used already exists. Sign in instead?')
    expect(within(alert).getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveAccessibleDescription('Email used already exists. Sign in instead?')
    await vi.waitFor(() => expect(email).toHaveFocus())
    expect(screen.queryByRole('heading', { name: 'Check your email' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument()

    // A different email clears the message.
    fireEvent.change(email, { target: { value: 'fresh@example.com' } })
    expect(screen.queryByText(/Email used already exists/)).not.toBeInTheDocument()
    expect(email).toHaveAttribute('aria-invalid', 'false')
  })

  it('focuses the signup error after every failed request', async () => {
    const user = userEvent.setup()
    const signUp = vi.fn().mockRejectedValue(new Error('Email already registered.'))
    const auth = supabaseAuth({ signUp })
    renderPage(<AuthContext.Provider value={auth}><SignUpPage /></AuthContext.Provider>)

    fireEvent.change(screen.getByRole('textbox', { name: 'Full name' }), { target: { value: 'Test Traveler' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'traveler@example.com' } })
    await selectAdultBirthDate(user)
    fireEvent.change(screen.getByRole('combobox', { name: 'Nationality' }), { target: { value: 'Filipino' } })
    fireEvent.change(screen.getByLabelText(/^Password\b/), { target: { value: 'Secret123' } })
    fireEvent.change(screen.getByLabelText(/^Confirm password\b/), { target: { value: 'Secret123' } })
    await user.click(screen.getByRole('checkbox'))

    const submit = screen.getByRole('button', { name: 'Create account' })
    for (let attempt = 1; attempt <= 2; attempt++) {
      await user.click(submit)
      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Email already registered.')
      expect(alert).toHaveFocus()
      expect(submit).toBeEnabled()
      expect(signUp).toHaveBeenCalledTimes(attempt)
    }
  })

  it('blocks Continue with Google until the Terms are accepted and an 18+ date of birth is set', async () => {
    const user = userEvent.setup()
    const signInWithGoogle = vi.fn().mockResolvedValue(undefined)
    renderPage(<AuthContext.Provider value={supabaseAuth({ signInWithGoogle })}><SignUpPage /></AuthContext.Provider>)
    const google = screen.getByRole('button', { name: 'Continue with Google' })

    await user.click(google)
    expect(signInWithGoogle).not.toHaveBeenCalled()
    expect(screen.getByText('Date of birth is required.')).toBeInTheDocument()
    expect(screen.getByText('You must accept the Terms and Privacy Policy.')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/before continuing with Google/)
    // Focus moves to the first consent field, as on submit; the email/password fields are not flagged.
    expect(screen.getByLabelText(/^Date of birth/)).toHaveFocus()
    expect(screen.queryByText('Full name is required.')).not.toBeInTheDocument()

    const dateOfBirth = document.querySelector<HTMLInputElement>('input[name="dateOfBirth"]')!
    fireEvent.change(dateOfBirth, { target: { value: `${new Date().getFullYear() - 16}-05-15` } })
    await user.click(google)
    expect(signInWithGoogle).not.toHaveBeenCalled()
    expect(screen.getByText('You must be at least 18 to create an account.')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox'))
    fireEvent.change(dateOfBirth, { target: { value: `${new Date().getFullYear() - 20}-05-15` } })
    // The hint clears as soon as both fields are valid, not on the next click.
    expect(screen.queryByText(/before continuing with Google/)).not.toBeInTheDocument()
    await user.click(google)
    expect(signInWithGoogle).toHaveBeenCalledOnce()
    expect(screen.queryByText(/before continuing with Google/)).not.toBeInTheDocument()
  })

  it('tracks password rules and the confirmation match as you type', async () => {
    const user = userEvent.setup()
    await openRegister()

    const [password, confirmation] = document.querySelectorAll<HTMLInputElement>('input[autocomplete="new-password"]')
    expect(confirmation).toHaveClass('border-ivory-line')

    await user.type(password, 'Secret')

    expect(screen.getByText('At least 8 characters')).not.toHaveClass('text-sage-deep')
    expect(screen.getByText('One uppercase letter')).toHaveClass('text-sage-deep')
    expect(screen.getByText('One number')).not.toHaveClass('text-sage-deep')

    await user.type(password, '123')
    expect(screen.getByText('At least 8 characters')).toHaveClass('text-sage-deep')
    expect(screen.getByText('One number')).toHaveClass('text-sage-deep')

    await user.type(confirmation, 'Secret124')
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument()
    expect(password).toHaveClass('border-ivory-line')
    expect(password).not.toHaveClass('border-danger')
    expect(confirmation).toHaveClass('border-danger')
    expect(confirmation).not.toHaveClass('border-ivory-line')

    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(password).toHaveClass('border-ivory-line')
    expect(password).not.toHaveClass('border-danger')
    expect(confirmation).toHaveClass('border-danger')
    expect(confirmation).not.toHaveClass('border-ivory-line')

    await user.clear(confirmation)
    expect(confirmation).toHaveClass('border-danger')
    expect(confirmation).not.toHaveClass('border-ivory-line')

    await user.type(confirmation, 'Secret123')
    expect(await screen.findByText('Passwords match')).toBeInTheDocument()
    expect(password).toHaveClass('border-ivory-line')
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

  it('lets the date of birth be typed as mm/dd/yyyy and syncs it with the calendar', async () => {
    const user = userEvent.setup()
    await openRegister()

    const field = screen.getByLabelText(/Date of birth/)
    await user.type(field, '01152000')
    expect(field).toHaveValue('01/15/2000')
    expect(document.querySelector<HTMLInputElement>('input[name="dateOfBirth"]')).toHaveValue('2000-01-15')

    // The calendar opens on the typed month with that day selected.
    await user.click(screen.getByRole('button', { name: 'Choose date of birth' }))
    const dialog = await screen.findByRole('dialog', { name: 'Choose date of birth' })
    expect(within(dialog).getByRole('button', { name: 'Month' })).toHaveTextContent('January')
    expect(within(dialog).getByRole('button', { name: 'Year' })).toHaveTextContent('2000')
    expect(within(dialog).getByRole('gridcell', { name: '15' })).toHaveAttribute('aria-selected', 'true')

    // Escape closes it; Clear empties the typed text too.
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Choose date of birth' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Choose date of birth' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Choose date of birth' })).getByRole('button', { name: 'Clear' }))
    expect(field).toHaveValue('')
  })

  it('explains a typed date that does not exist instead of calling it missing', async () => {
    const user = userEvent.setup()
    await openRegister()

    await user.type(screen.getByLabelText(/Date of birth/), '02312000')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Enter a real date as mm/dd/yyyy.')).toBeInTheDocument()
    expect(screen.queryByText('Date of birth is required.')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Date of birth/)).toHaveAttribute('aria-invalid', 'true')
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
    expect(screen.getByLabelText<HTMLInputElement>(/Date of birth/).value).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)

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

  describe('email confirmation screen', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    function advanceSeconds(seconds: number) {
      for (let i = 0; i < seconds; i++) {
        act(() => {
          vi.advanceTimersByTime(1000)
        })
      }
    }

    it('uses the redesigned tokens, shows a Spam/Junk tip, keeps the button label fixed, and disables resend right after sign-up', async () => {
      const user = userEvent.setup()
      renderPage(<AuthContext.Provider value={supabaseAuth()}><SignUpPage /></AuthContext.Provider>)

      await fillAndSubmitValidForm(user, 'maria@example.com')

      expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
      const statusBox = screen.getByRole('status')
      expect(statusBox).toHaveClass('bg-sage-soft', 'border-ivory-line', 'text-ink')
      expect(screen.getByText('maria@example.com')).toBeInTheDocument()
      expect(screen.getByText(/Spam or Junk folder/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Resend confirmation email' })).toBeDisabled()
      const countdown = screen.getByText('You can resend in 60s.')
      expect(countdown).toHaveAttribute('aria-live', 'off')
      expect(screen.getByRole('button', { name: 'Use a different email' })).toBeInTheDocument()
    })

    it('re-enables resend after the initial cooldown and enforces a 60-second cooldown on resend', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const resendConfirmationEmail = vi.fn().mockResolvedValue(undefined)
      renderPage(<AuthContext.Provider value={supabaseAuth({ resendConfirmationEmail })}><SignUpPage /></AuthContext.Provider>)

      await fillAndSubmitValidForm(user, 'maria@example.com')
      await screen.findByRole('heading', { name: 'Check your email' })
      expect(screen.getByRole('button', { name: 'Resend confirmation email' })).toBeDisabled()
      expect(screen.getByText('You can resend in 60s.')).toBeInTheDocument()

      advanceSeconds(60)

      const resendButton = screen.getByRole('button', { name: 'Resend confirmation email' })
      expect(resendButton).toBeEnabled()
      expect(screen.queryByText(/You can resend in/)).not.toBeInTheDocument()
      await user.click(resendButton)

      expect(resendConfirmationEmail).toHaveBeenCalledWith('maria@example.com')
      const feedback = await screen.findByText('Confirmation email resent.')
      expect(feedback).toHaveClass('text-sage-deep')
      expect(screen.getByRole('button', { name: 'Resend confirmation email' })).toBeDisabled()
      expect(screen.getByText('You can resend in 60s.')).toBeInTheDocument()

      advanceSeconds(60)

      expect(screen.getByRole('button', { name: 'Resend confirmation email' })).toBeEnabled()
    })

    it('starts the cooldown using the wait time from a Supabase rate-limit error', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const resendConfirmationEmail = vi.fn().mockRejectedValue(
        new Error('For security purposes, you can only request this after 45 seconds.'),
      )
      renderPage(<AuthContext.Provider value={supabaseAuth({ resendConfirmationEmail })}><SignUpPage /></AuthContext.Provider>)

      await fillAndSubmitValidForm(user, 'maria@example.com')
      await screen.findByRole('heading', { name: 'Check your email' })

      advanceSeconds(60)

      await user.click(screen.getByRole('button', { name: 'Resend confirmation email' }))

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('For security purposes, you can only request this after 45 seconds.')
      expect(alert).toHaveClass('text-danger')
      expect(screen.getByRole('button', { name: 'Resend confirmation email' })).toBeDisabled()
      expect(screen.getByText('You can resend in 45s.')).toBeInTheDocument()

      advanceSeconds(45)

      expect(screen.getByRole('button', { name: 'Resend confirmation email' })).toBeEnabled()
    })

    it('shows an error alert for non-rate-limit failures without locking the button', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const resendConfirmationEmail = vi.fn().mockRejectedValue(new Error('Network error'))
      renderPage(<AuthContext.Provider value={supabaseAuth({ resendConfirmationEmail })}><SignUpPage /></AuthContext.Provider>)

      await fillAndSubmitValidForm(user, 'maria@example.com')
      await screen.findByRole('heading', { name: 'Check your email' })

      advanceSeconds(60)

      await user.click(screen.getByRole('button', { name: 'Resend confirmation email' }))

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Network error')
      expect(alert).toHaveClass('text-danger')
      expect(screen.getByRole('button', { name: 'Resend confirmation email' })).toBeEnabled()
    })

    it('returns to the form and focuses the email field when "Use a different email" is clicked', async () => {
      const user = userEvent.setup()
      renderPage(<AuthContext.Provider value={supabaseAuth()}><SignUpPage /></AuthContext.Provider>)

      await fillAndSubmitValidForm(user, 'mistyped@exampl.com')
      await screen.findByRole('heading', { name: 'Check your email' })

      await user.click(screen.getByRole('button', { name: 'Use a different email' }))

      expect(await screen.findByRole('heading', { name: 'Create Account' })).toBeInTheDocument()
      const emailInput = screen.getByRole('textbox', { name: 'Email' })
      expect(emailInput).toHaveValue('mistyped@exampl.com')
      expect(emailInput).toHaveFocus()
      expect(screen.getByRole('textbox', { name: 'Full name' })).toHaveValue('Juan Dela Cruz')
    })
  })
})
