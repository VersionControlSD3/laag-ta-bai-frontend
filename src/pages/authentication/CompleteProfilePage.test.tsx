import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { writeJson } from '@/lib/storage'
import { routes } from '@/routes'
import { mockFetch, renderRoutes } from '@/test/render'

/** Fake API: GET/PATCH /v1/me with a server-side termsAcceptedAt, empty landmark lists. */
function fakeApi(initialTerms: string | null | undefined) {
  let termsAcceptedAt = initialTerms
  const patches: unknown[] = []
  const profile = () => ({ id: 'local-dev-user', displayName: 'Gia', nationality: null, termsAcceptedAt })
  mockFetch((url, init) => {
    if (url.pathname === '/v1/me' && init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body))
      patches.push(body)
      if (body.acceptTerms) termsAcceptedAt = '2026-11-23T01:00:00.000Z'
      return { data: profile() }
    }
    if (url.pathname === '/v1/me') {
      return { data: { profile: profile(), email: 'gia@example.test', rank: { level: 1, title: 'Wanderer', xp: 0, currentLevelXp: 0, nextLevelXp: 100 }, stats: { visitedCount: 0, districtCoveragePercent: 0, streakCount: 0 }, badges: [], recentVisits: [] } }
    }
    return { data: [] }
  })
  return patches
}

describe('complete profile for new Google accounts', () => {
  beforeEach(() => {
    writeJson('preferences', { onboarded: true })
    writeJson('dev-user', { id: 'local-dev-user', email: 'gia@example.test', displayName: 'Gia' })
  })

  it('sends a profile without Terms to /complete-profile and blocks an empty form', async () => {
    const patches = fakeApi(null)
    renderRoutes(routes, '/landmarks/fort-san-pedro')
    expect(await screen.findByRole('heading', { name: 'Complete your profile' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByText('Date of birth is required.')).toBeInTheDocument()
    expect(screen.getByText('Nationality is required.')).toBeInTheDocument()
    expect(screen.getByText('You must accept the Terms and Privacy Policy.')).toBeInTheDocument()
    expect(patches).toEqual([])

    // Errors are linked to their controls, and focus moves to the first invalid one.
    expect(screen.getByRole('combobox', { name: /Nationality/ })).toHaveAccessibleDescription('Nationality is required.')
    const terms = screen.getByRole('checkbox', { name: /I agree/ })
    expect(terms).toHaveAttribute('aria-invalid', 'true')
    expect(terms).toHaveAccessibleDescription('You must accept the Terms and Privacy Policy.')
    expect(document.activeElement).toHaveAttribute('aria-invalid', 'true')
    expect(document.activeElement).toHaveAccessibleDescription(/Date of birth is required/)
  })

  it('saves nationality and Terms, never the date of birth, then opens the app', async () => {
    const patches = fakeApi(null)
    renderRoutes(routes, '/')
    await screen.findByRole('heading', { name: 'Complete your profile' })

    await userEvent.click(screen.getByRole('button', { name: 'Choose date of birth' }))
    // The picker opens 18 years back; the 1st of that month is always old enough.
    await userEvent.click(screen.getByRole('gridcell', { name: '1' }))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Nationality/ }), 'Filipino')
    await userEvent.click(screen.getByRole('checkbox', { name: /I agree/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    expect(patches).toEqual([{ nationality: 'Filipino', acceptTerms: true }])
  })

  it.each([
    ['has accepted', '2026-11-01T00:00:00.000Z'],
    ['comes from an API without the field yet', undefined],
  ])('lets a profile that %s into the app', async (_label, terms) => {
    fakeApi(terms)
    renderRoutes(routes, '/')
    expect(await screen.findByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    // Give the profile request time to land: a redirect would show up here.
    await expect(screen.findByRole('heading', { name: 'Complete your profile' }, { timeout: 500 })).rejects.toThrow()
  })

  it('shows a loader, not the app, until the first profile arrives', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}))
    renderRoutes(routes, '/')
    expect(await screen.findByRole('status')).toHaveTextContent('Loading')
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
  })

  it('lets the user in when the profile request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) =>
      String(input instanceof Request ? input.url : input).includes('/v1/me')
        ? new Response(JSON.stringify({ error: { code: 'bad_request', message: 'Nope' } }), { status: 400 })
        : new Response(JSON.stringify({ data: [] }), { status: 200 }),
    )
    renderRoutes(routes, '/')
    expect(await screen.findByRole('navigation', { name: 'Main' })).toBeInTheDocument()
  })

  it('sends a completed profile away from /complete-profile', async () => {
    fakeApi('2026-11-01T00:00:00.000Z')
    renderRoutes(routes, '/complete-profile')
    expect(await screen.findByRole('navigation', { name: 'Main' })).toBeInTheDocument()
  })
})
