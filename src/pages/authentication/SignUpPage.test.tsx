import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { writeJson } from '@/lib/storage'
import { routes } from '@/routes'
import { renderRoutes } from '@/test/render'

async function openRegister() {
  renderRoutes(routes, '/register')
  return await screen.findByRole('heading', { name: 'Create Account' })
}

describe('sign-up page', () => {
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

    expect(screen.getByText('At least 8 characters')).not.toHaveClass('text-success')
    expect(screen.getByText('One uppercase letter')).toHaveClass('text-success')
    expect(screen.getByText('One number')).not.toHaveClass('text-success')

    await user.type(password, '123')
    expect(screen.getByText('At least 8 characters')).toHaveClass('text-success')
    expect(screen.getByText('One number')).toHaveClass('text-success')

    await user.type(confirmation, 'Secret124')
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument()
    await user.clear(confirmation)
    await user.type(confirmation, 'Secret123')
    expect(await screen.findByText('Passwords match')).toBeInTheDocument()
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

  it('blocks future birth dates and paging past the current month', async () => {
    const user = userEvent.setup()
    await openRegister()

    await user.click(screen.getByRole('button', { name: 'Choose date of birth' }))
    const dialog = await screen.findByRole('dialog', { name: 'Choose date of birth' })
    const now = new Date()

    // The default view is this month, 18 years ago: picking the current year
    // lands on the current month.
    await user.click(within(dialog).getByRole('button', { name: 'Year' }))
    await user.click(await within(dialog).findByRole('option', { name: String(now.getFullYear()) }))

    expect(within(dialog).getByRole('button', { name: 'Next month' })).toBeDisabled()

    const dayCells = within(dialog).getAllByRole('gridcell')
    const futureDays = dayCells.filter((cell) => Number(cell.textContent) > now.getDate())
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    if (now.getDate() < daysInMonth) expect(futureDays.length).toBeGreaterThan(0)
    for (const cell of futureDays) expect(cell).toBeDisabled()

    // The old "Today" action set a birth date of today; only Clear remains.
    expect(within(dialog).queryByRole('button', { name: 'Today' })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Clear' })).toBeInTheDocument()
  })

  it('keeps the selected month when the calendar is reopened', async () => {
    const user = userEvent.setup()
    await openRegister()

    await user.click(screen.getByRole('button', { name: 'Choose date of birth' }))
    let dialog = await screen.findByRole('dialog', { name: 'Choose date of birth' })
    const now = new Date()
    await user.click(within(dialog).getByRole('button', { name: 'Year' }))
    await user.click(await within(dialog).findByRole('option', { name: String(now.getFullYear() - 1) }))
    const pastDay = within(dialog).getAllByRole('gridcell')[0]
    await user.click(pastDay)
    expect(screen.getByRole('button', { name: 'Choose date of birth' })).not.toHaveTextContent('mm/dd/yyyy')

    // Reopening keeps the chosen month instead of jumping back to today.
    await user.click(screen.getByRole('button', { name: 'Choose date of birth' }))
    dialog = await screen.findByRole('dialog', { name: 'Choose date of birth' })
    expect(within(dialog).getByRole('button', { name: 'Year' })).toHaveTextContent(String(now.getFullYear() - 1))
  })

  it('uses the night background when the Dark preference is on', async () => {
    writeJson('preferences', { theme: 'dark' })
    const { container } = renderRoutes(routes, '/register')
    expect(await screen.findByRole('heading', { name: 'Create Account' })).toBeInTheDocument()
    expect(container.querySelector('main')).toHaveClass('auth-signup-night')
  })

  it('uses the day background when the Light preference is on', async () => {
    writeJson('preferences', { theme: 'light' })
    const { container } = renderRoutes(routes, '/register')
    expect(await screen.findByRole('heading', { name: 'Create Account' })).toBeInTheDocument()
    expect(container.querySelector('main')).toHaveClass('auth-signup-day')
  })

  it('renders the dev sign-in notice with an explicit text colour', async () => {
    await openRegister()
    const notice = await screen.findByText("Supabase isn't configured.")
    expect(notice.closest('div')).toHaveClass('text-navy')
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

  it('renders the Terms route instead of the 404 page', async () => {
    renderRoutes(routes, '/terms')
    expect(await screen.findByRole('heading', { name: 'Terms of Use' })).toBeInTheDocument()
    expect(screen.queryByText(/This page doesn't exist/)).not.toBeInTheDocument()
  })

  it('renders the Privacy route instead of the 404 page', async () => {
    renderRoutes(routes, '/privacy')
    expect(await screen.findByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument()
    expect(screen.queryByText(/This page doesn't exist/)).not.toBeInTheDocument()
  })
})
