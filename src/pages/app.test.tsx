import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Landmark } from '@/api/types'
import { writeJson } from '@/lib/storage'
import { routes } from '@/routes'
import { mockFetch, renderRoutes } from '@/test/render'

const fort: Landmark = {
  id: 'fort-san-pedro',
  name: 'Fort San Pedro',
  category: 'fort',
  district: 'Cebu City',
  latitude: 10.29,
  longitude: 123.9,
  imageUrl: null,
  admissionFee: 30,
  rating: 4.7,
  visitCount: 12,
  estimatedVisitMinutes: 60,
  visitingHours: '8:00 AM - 7:00 PM',
  story: { about: 'A triangular fort.', significance: 'Oldest fort.', architecture: 'Coral stone.', trivia: 'Was a zoo.' },
}

describe('app routes', () => {
  it('shows the splash screen for first-time visitors', async () => {
    renderRoutes(routes, '/')
    expect(await screen.findByRole('main', { name: 'Preparing your Cebu journey' })).toBeInTheDocument()
  })

  it('shows the bottom navigation and popular landmarks on Explore', async () => {
    writeJson('preferences', { onboarded: true })
    mockFetch(() => ({ data: [fort] }))
    renderRoutes(routes, '/')
    expect(await screen.findByText('Fort San Pedro')).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Main' })
    for (const label of ['Explore', 'Archives', 'Mastery', 'Profile']) expect(nav).toHaveTextContent(label)
    expect(screen.getByRole('link', { name: 'Scan' })).toBeInTheDocument()
  })

  it('renders landmark story sections and saves a bookmark', async () => {
    mockFetch(() => ({ data: fort }))
    renderRoutes(routes, '/landmarks/fort-san-pedro')
    expect(await screen.findByRole('heading', { name: 'Fort San Pedro' })).toBeInTheDocument()
    expect(screen.getByText('A triangular fort.')).toBeInTheDocument()
    expect(screen.getByText('Oldest fort.')).toBeInTheDocument()
    expect(screen.getByText('Was a zoo.')).toBeInTheDocument()
    expect(screen.getByText('Rated 4.7 out of 5')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'About',
      'Significance',
      'History',
      'Trivia',
      'Nearby Stores',
    ])
    expect(screen.queryByText(/Landmark matched/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ask bAI/ })).toHaveAttribute('href', '/landmarks/fort-san-pedro/chat')
    expect(screen.getByRole('link', { name: /Scan another landmark/ })).toHaveAttribute('href', '/scan')

    await userEvent.click(screen.getByRole('button', { name: 'Save for offline reading' }))
    expect(screen.getByRole('button', { name: 'Remove bookmark' })).toHaveAttribute('aria-pressed', 'true')
    expect(JSON.parse(localStorage.getItem('laagtabai:bookmarks')!)[0].id).toBe('fort-san-pedro')
  })

  it('shows the scan match when opened from a scan', async () => {
    mockFetch(() => ({ data: fort }))
    renderRoutes(routes, { pathname: '/landmarks/fort-san-pedro', state: { confidence: 0.98 } })
    expect(await screen.findByText('Landmark matched · 98%')).toBeInTheDocument()
    expect(screen.getByText('Scan to story')).toBeInTheDocument()
  })

  it('notes story parts that have not been written yet', async () => {
    mockFetch(() => ({ data: { ...fort, story: { ...fort.story, trivia: '' } } }))
    renderRoutes(routes, '/landmarks/fort-san-pedro')
    expect(await screen.findByText("This part of the story hasn't been written yet.")).toBeInTheDocument()
  })

  it('explains when a landmark does not exist', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'not_found', message: 'Not found' } }), { status: 404 }),
    )
    renderRoutes(routes, '/landmarks/nowhere')
    expect(await screen.findByText("We couldn't find this landmark")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Explore landmarks' })).toHaveAttribute('href', '/')
  })

  it('asks for permissions and shows the denied state when the browser blocks them', async () => {
    renderRoutes(routes, '/permissions')
    expect(await screen.findAllByRole('checkbox')).toHaveLength(2)
    for (const name of [/Camera/, /Location/]) expect(screen.getByRole('checkbox', { name })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('button', { name: 'Maybe later' })).toBeInTheDocument()

    // jsdom has no camera or geolocation, so both requests are denied.
    await userEvent.click(screen.getByRole('button', { name: 'ALLOW PERMISSIONS' }))
    expect(await screen.findByRole('heading', { name: 'No worries' })).toBeInTheDocument()
    expect(screen.getAllByText('Blocked')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'CONTINUE' })).toBeInTheDocument()
  })

  it('shows the partial state and tells a dismissed prompt apart from a blocked one', async () => {
    // Location is allowed; the camera prompt was closed, so its permission is still 'prompt'.
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: (ok: PositionCallback) => ok({} as GeolocationPosition) },
    })
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: async () => ({ state: 'prompt' }) },
    })
    try {
      renderRoutes(routes, '/permissions')
      await userEvent.click(await screen.findByRole('button', { name: 'ALLOW PERMISSIONS' }))
      expect(await screen.findByRole('heading', { name: 'Almost set' })).toBeInTheDocument()
      expect(screen.getByText('Allowed')).toBeInTheDocument()
      expect(screen.getByText('Not now')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    } finally {
      delete (navigator as { geolocation?: unknown }).geolocation
      delete (navigator as { permissions?: unknown }).permissions
    }
  })

  it('offers dev sign-in when Supabase is not configured', async () => {
    renderRoutes(routes, '/login')
    expect(await screen.findByRole('button', { name: 'Continue as dev traveler' })).toBeInTheDocument()
  })
})
