import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Me, ProfileUpdate } from '@/api/types'
import { writeJson } from '@/lib/storage'
import { mockFetch, renderPage } from '@/test/render'
import ProfilePage from './ProfilePage'

const sampleMe = (overrides: Partial<Me> = {}): Me => ({
  profile: {
    id: 'local-dev-user',
    displayName: 'Carlos M.',
    avatarUrl: null,
    nationality: 'Filipino',
    bio: 'Exploring heritage churches across Cebu.',
    language: 'en',
    xp: 340,
    streakCount: 5,
    lastActiveDate: '2026-11-10',
  },
  email: 'carlos@cebu.ph',
  rank: {
    level: 3,
    title: 'Cultural Navigator',
    xp: 340,
    currentLevelXp: 250,
    nextLevelXp: 500,
  },
  stats: {
    visitedCount: 12,
    districtCoveragePercent: 35,
    streakCount: 5,
  },
  badges: [
    { questId: 'quest-1', name: 'Fort Explorer' },
    { questId: 'quest-2', name: 'Old Cebu Walker' },
  ],
  recentVisits: [],
  ...overrides,
})

function signInDevUser() {
  writeJson('dev-user', {
    id: 'local-dev-user',
    email: 'carlos@cebu.ph',
    displayName: 'Carlos M.',
  })
}

describe('ProfilePage', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.dataset.theme = 'light'
    vi.restoreAllMocks()
  })

  it('shows SignInPrompt when signed out while keeping preferences available', () => {
    renderPage(<ProfilePage />, '/profile')

    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument()
    expect(screen.getByText(/Sign in to set up your traveler profile/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Preferences/i })).toBeInTheDocument()
  })

  it('shows error state and retries when GET /v1/me fails', async () => {
    signInDevUser()
    let attempts = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      attempts += 1
      if (attempts === 1) {
        return new Response(
          JSON.stringify({ error: { code: 'server_error', message: 'Failed to load profile' } }),
          { status: 500, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return new Response(JSON.stringify({ data: sampleMe() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    renderPage(<ProfilePage />, '/profile')

    expect(await screen.findByText(/Failed to load profile/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Try again/i }))
    expect(await screen.findByRole('heading', { name: 'Carlos M.' })).toBeInTheDocument()
  })

  it('displays API profile data from useMe() including rank, XP, stats, and badges', async () => {
    signInDevUser()
    mockFetch(() => ({ data: sampleMe() }))

    renderPage(<ProfilePage />, '/profile')

    expect(await screen.findByRole('heading', { name: 'Carlos M.' })).toBeInTheDocument()
    expect(screen.getByText(/Cultural Navigator · LEVEL 3/i)).toBeInTheDocument()
    expect(screen.getByText('carlos@cebu.ph')).toBeInTheDocument()
    expect(screen.getByText('Filipino')).toBeInTheDocument()
    expect(screen.getByText('Exploring heritage churches across Cebu.')).toBeInTheDocument()
    expect(screen.getByLabelText(/Avatar for Carlos M.: initials CM/i)).toBeInTheDocument()

    // Stats from API
    const stats = screen.getByRole('region', { name: 'Exploration statistics' })
    expect(within(stats).getByText('12')).toBeInTheDocument()
    expect(within(stats).getByText('2')).toBeInTheDocument()
    expect(within(stats).getByText('5')).toBeInTheDocument()

    // Level & XP progress from API
    expect(screen.getByText('340 XP')).toBeInTheDocument()
    expect(screen.getByText('160 XP to reach Level 4')).toBeInTheDocument()

    // Earned badges from API
    const badgeList = screen.getByRole('list', { name: 'Earned badges' })
    expect(within(badgeList).getByText('Fort Explorer')).toBeInTheDocument()
    expect(within(badgeList).getByText('Old Cebu Walker')).toBeInTheDocument()
  })

  it('saves profile edits via PATCH /v1/me (useUpdateMe) and refreshes the displayed profile', async () => {
    signInDevUser()
    let currentMe = sampleMe()
    const patchCalls: ProfileUpdate[] = []

    mockFetch((url, init) => {
      if (url.pathname.endsWith('/v1/me') && init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body)) as ProfileUpdate
        patchCalls.push(body)
        currentMe = {
          ...currentMe,
          profile: {
            ...currentMe.profile,
            displayName: body.displayName ?? currentMe.profile.displayName,
            nationality: body.nationality !== undefined ? body.nationality : currentMe.profile.nationality,
            bio: body.bio !== undefined ? body.bio : currentMe.profile.bio,
          },
        }
        return { data: currentMe.profile }
      }
      return { data: currentMe }
    })

    renderPage(<ProfilePage />, '/profile')

    const editBtn = await screen.findByRole('button', { name: 'Edit profile details' })
    expect(within(editBtn).getByText('Edit')).toBeInTheDocument()

    await userEvent.click(editBtn)
    expect(within(editBtn).getByText('Editing')).toBeInTheDocument()

    const editSection = screen.getByRole('region', { name: /Edit profile details/i })
    const nameInput = within(editSection).getByLabelText(/Display name/i)
    const nationalityInput = within(editSection).getByLabelText(/Nationality/i)
    const bioInput = within(editSection).getByLabelText(/Travel bio/i)

    // Validation when display name is blank
    await userEvent.clear(nameInput)
    await userEvent.click(within(editSection).getByRole('button', { name: /Save changes/i }))
    expect(within(editSection).getByRole('alert')).toHaveTextContent('Display name is required.')
    expect(patchCalls).toHaveLength(0)

    await userEvent.type(nameInput, 'Maria Santos')
    await userEvent.clear(nationalityInput)
    await userEvent.type(nationalityInput, 'Cebuana')
    await userEvent.clear(bioInput)

    await userEvent.click(within(editSection).getByRole('button', { name: /Save changes/i }))

    expect(patchCalls).toEqual([
      {
        displayName: 'Maria Santos',
        nationality: 'Cebuana',
        bio: null,
      },
    ])

    expect(await screen.findByRole('heading', { name: 'Maria Santos' })).toBeInTheDocument()
    expect(screen.getByText('Cebuana')).toBeInTheDocument()
    expect(screen.getByText(/No travel bio yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /Edit profile details/i })).not.toBeInTheDocument()
  })

  it('toggles show clear on/off states not by color alone with accessible labels', async () => {
    renderPage(<ProfilePage />, '/profile')

    const darkToggle = screen.getByRole('switch', { name: /Dark theme/i })
    expect(darkToggle).toHaveAttribute('aria-checked', 'false')
    expect(darkToggle).toHaveAccessibleName('Dark theme, off')

    await userEvent.click(darkToggle)

    expect(darkToggle).toHaveAttribute('aria-checked', 'true')
    expect(darkToggle).toHaveAccessibleName('Dark theme, on')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('shows supported languages only (English and Cebuano) and updates language via PATCH /v1/me when signed in', async () => {
    signInDevUser()
    const patchCalls: ProfileUpdate[] = []
    mockFetch((url, init) => {
      if (url.pathname.endsWith('/v1/me') && init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body)) as ProfileUpdate
        patchCalls.push(body)
        return { data: sampleMe().profile }
      }
      return { data: sampleMe() }
    })

    renderPage(<ProfilePage />, '/profile')

    const langBtn = screen.getByRole('button', { name: /Language, current selection: English/i })
    await userEvent.click(langBtn)

    const dialog = screen.getByRole('dialog', { name: /Choose language/i })
    expect(within(dialog).queryByRole('radio', { name: /Filipino/i })).not.toBeInTheDocument()

    const cebBtn = within(dialog).getByRole('radio', { name: /Cebuano/i })
    await userEvent.click(cebBtn)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Language, current selection: Cebuano/i })).toBeInTheDocument()
    expect(patchCalls).toEqual([{ language: 'ceb' }])
  })

  it('clearly separates the About the developer section from preferences', () => {
    renderPage(<ProfilePage />, '/profile')

    const devHeading = screen.getByRole('heading', { name: /About the developer/i })
    const prefHeading = screen.getByRole('heading', { name: /Preferences/i })

    expect(devHeading).toBeInTheDocument()
    expect(prefHeading.compareDocumentPosition(devHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(
      screen.getByText(/Your AI-powered companion for discovering the stories, places, and culture of Cebu/i),
    ).toBeInTheDocument()
  })

  it('opens confirmation modal before logging out when signed in', async () => {
    signInDevUser()
    mockFetch(() => ({ data: sampleMe() }))

    renderPage(<ProfilePage />, '/profile')

    const logoutBtn = await screen.findByRole('button', { name: /^Log out$/i })
    await userEvent.click(logoutBtn)

    const dialog = screen.getByRole('dialog', { name: /Log out\?/i })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText(/Are you sure you want to log out/i)).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows real browser permission states (defaulting Location to not enabled) and uses TopNavbar', async () => {
    writeJson('location-rationale-accepted', true)
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: {
        query: async ({ name }: { name: string }) => ({
          state: name === 'camera' ? 'granted' : 'prompt',
        }),
      },
    })

    try {
      renderPage(<ProfilePage />, '/profile')

      const permBtn = await screen.findByRole('button', { name: /Permissions, 1 allowed/i })
      await userEvent.click(permBtn)

      expect(screen.getByRole('heading', { name: 'Permissions' })).toBeInTheDocument()
      expect(screen.getByText('Allowed')).toBeInTheDocument()
      expect(screen.getByText('Not enabled')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Open permissions setup/i })).toHaveAttribute('href', '/permissions')

      await userEvent.click(screen.getByRole('button', { name: 'Back to profile' }))
      expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument()
    } finally {
      delete (navigator as { permissions?: unknown }).permissions
    }
  })
})
