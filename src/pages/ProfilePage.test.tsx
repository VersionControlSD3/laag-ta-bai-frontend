import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, beforeEach } from 'vitest'
import ProfilePage from './ProfilePage'
import { renderPage } from '@/test/render'

describe('ProfilePage', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.dataset.theme = 'light'
  })

  it('displays profile picture / avatar, name, and bio clearly at the top', () => {
    renderPage(<ProfilePage />, '/profile')

    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument()

    // Name and rank
    expect(screen.getByText('Andrea M.')).toBeInTheDocument()
    expect(screen.getByText(/CEBUANO EXPLORER · LEVEL 1/i)).toBeInTheDocument()
    expect(screen.getByText('andrea@example.com')).toBeInTheDocument()
    expect(screen.getByText(/No travel bio yet/i)).toBeInTheDocument()

    // Avatar has accessible label
    expect(screen.getByLabelText(/Avatar for Andrea M./i)).toBeInTheDocument()
  })

  it('renders settings card with language, permissions, dark theme, and notification controls', () => {
    renderPage(<ProfilePage />, '/profile')

    expect(screen.getByRole('heading', { name: 'PREFERENCES' })).toBeInTheDocument()

    // Controls with labels and accessible row descriptions
    expect(screen.getByRole('button', { name: /Language, current selection/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Permissions/i })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /Notifications/i })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /Dark theme/i })).toBeInTheDocument()
  })

  it('toggles show clear on/off states not by color alone with accessible labels', async () => {
    renderPage(<ProfilePage />, '/profile')

    const darkToggle = screen.getByRole('switch', { name: /Dark theme/i })
    expect(darkToggle).toHaveAttribute('aria-checked', 'false')
    expect(darkToggle).toHaveAccessibleName('Dark theme, off')

    // Click dark mode toggle
    await userEvent.click(darkToggle)

    expect(darkToggle).toHaveAttribute('aria-checked', 'true')
    expect(darkToggle).toHaveAccessibleName('Dark theme, on')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('shows current language selection and opens the language selector modal', async () => {
    renderPage(<ProfilePage />, '/profile')

    const langBtn = screen.getByRole('button', { name: /Language, current selection: English/i })
    await userEvent.click(langBtn)

    // Language modal dialog
    const dialog = screen.getByRole('dialog', { name: /Choose language/i })
    expect(dialog).toBeInTheDocument()

    // Select Cebuano
    const cebBtn = within(dialog).getByRole('radio', { name: /Cebuano/i })
    await userEvent.click(cebBtn)

    // Dialog closes and selection is updated
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Language, current selection: Cebuano/i })).toBeInTheDocument()
  })

  it('clearly separates the About the Developer section from settings', () => {
    renderPage(<ProfilePage />, '/profile')

    const devHeading = screen.getByRole('heading', { name: 'ABOUT THE DEVELOPER' })
    const prefHeading = screen.getByRole('heading', { name: 'PREFERENCES' })

    expect(devHeading).toBeInTheDocument()
    expect(prefHeading.compareDocumentPosition(devHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(screen.getByText(/Your AI-powered companion for discovering the stories, places, and culture of Cebu/i)).toBeInTheDocument()
  })

  it('opens confirmation modal before logging out', async () => {
    renderPage(<ProfilePage />, '/profile')

    const logoutBtn = screen.getByRole('button', { name: /^Log out$/i })
    await userEvent.click(logoutBtn)

    const dialog = screen.getByRole('dialog', { name: /Log out\?/i })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText(/Are you sure you want to log out/i)).toBeInTheDocument()

    // Cancel closes dialog
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens confirmation modal before deleting account', async () => {
    renderPage(<ProfilePage />, '/profile')

    const deleteBtn = screen.getByRole('button', { name: /^Delete account$/i })
    await userEvent.click(deleteBtn)

    const dialog = screen.getByRole('dialog', { name: /Delete account\?/i })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText(/This removes your profile, saved discoveries, and progress/i)).toBeInTheDocument()

    // Cancel closes dialog
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('allows editing profile details in an inline dropdown and toggles button from Edit to Editing', async () => {
    renderPage(<ProfilePage />, '/profile')

    const editBtn = screen.getByRole('button', { name: 'Edit profile details' })
    expect(within(editBtn).getByText('Edit')).toBeInTheDocument()

    // Click to open dropdown editor
    await userEvent.click(editBtn)

    // Button text changes to "Editing"
    expect(within(editBtn).getByText('Editing')).toBeInTheDocument()

    // It is rendered as an inline dropdown section, NOT a modal dialog
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const editSection = screen.getByRole('region', { name: /Edit profile details/i })
    expect(editSection).toBeInTheDocument()

    const nameInput = within(editSection).getByLabelText(/Display name/i)
    const bioInput = within(editSection).getByLabelText(/Travel bio/i)

    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Maria Santos')
    await userEvent.clear(bioInput)

    await userEvent.click(within(editSection).getByRole('button', { name: /Save changes/i }))

    // Dropdown closes, button reverts to "Edit", and profile updates
    expect(screen.queryByRole('region', { name: /Edit profile details/i })).not.toBeInTheDocument()
    expect(within(editBtn).getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Maria Santos')).toBeInTheDocument()
    expect(screen.getByText(/No travel bio yet/i)).toBeInTheDocument()
  })

  it('opens and manages permissions component page without modal scrollbar', async () => {
    renderPage(<ProfilePage />, '/profile')

    const permBtn = screen.getByRole('button', { name: /Permissions, 3 allowed/i })
    await userEvent.click(permBtn)

    // Should NOT be a modal dialog
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Permissions component page view is active
    expect(screen.getByRole('heading', { name: 'Permissions' })).toBeInTheDocument()
    expect(screen.getByText(/You're in control/i)).toBeInTheDocument()

    // Location toggle inside permissions page
    const locToggle = screen.getByRole('switch', { name: /Location/i })
    expect(locToggle).toHaveAttribute('aria-checked', 'true')

    await userEvent.click(locToggle)
    expect(locToggle).toHaveAttribute('aria-checked', 'false')

    // Click Done button to return to main profile page
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument()

    // Re-enter permissions and test Back button
    await userEvent.click(screen.getByRole('button', { name: /^Permissions/i }))
    expect(screen.getByRole('heading', { name: 'Permissions' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Back to profile' }))
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument()
  })
})
