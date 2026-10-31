import { screen, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Landmark, Me, Visit } from '@/api/types'
import { resetBookmarksCache } from '@/features/bookmarks/useBookmarks'
import { writeJson } from '@/lib/storage'
import { renderPage } from '@/test/render'
import ArchivesPage from './ArchivesPage'

const cross: Landmark = {
  id: 'magellans-cross',
  name: "Magellan's Cross",
  category: 'monument',
  district: 'Cebu City',
  latitude: 10.293,
  longitude: 123.902,
  imageUrl: '/landmarks/magellan.jpg',
  admissionFee: 0,
  rating: 4.7,
  visitCount: 120,
  estimatedVisitMinutes: 30,
  visitingHours: '8:00 AM - 6:00 PM',
  story: { about: 'Planted in 1521.', significance: 'Birth of Christianity.', architecture: 'Stone kiosk.', trivia: 'Housed in a chapel.' },
}

const fort: Landmark = {
  id: 'fort-san-pedro',
  name: 'Fort San Pedro',
  category: 'fort',
  district: 'Cebu City',
  latitude: 10.292,
  longitude: 123.905,
  imageUrl: '/landmarks/fort.jpg',
  admissionFee: 30,
  rating: 4.8,
  visitCount: 90,
  estimatedVisitMinutes: 60,
  visitingHours: '8:00 AM - 7:00 PM',
  story: { about: 'A triangular fort.', significance: 'Oldest fort.', architecture: 'Coral stone.', trivia: 'Was a zoo.' },
}

const bookmark = (landmark: Landmark, savedAt = '2026-10-30T09:00:00.000Z') => ({ ...landmark, savedAt })

const startOfToday = (() => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
})()

/** A visit on a day relative to today, so Today/Yesterday stay deterministic. */
function visitAt(daysAgo: number, hour: number, overrides: Partial<Visit> = {}): Visit {
  const date = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() - daysAgo, hour)
  return {
    id: `visit-${daysAgo}-${hour}`,
    userId: 'local-dev-user',
    landmarkId: cross.id,
    source: 'scan',
    xpAwarded: 50,
    createdAt: date.toISOString(),
    ...overrides,
  }
}

function meWith(recentVisits: Visit[]): Me {
  return {
    profile: {
      id: 'local-dev-user',
      displayName: 'Dev Traveler',
      avatarUrl: null,
      nationality: null,
      bio: null,
      language: 'en',
      xp: 100,
      streakCount: 1,
      lastActiveDate: null,
    },
    email: null,
    rank: { level: 1, title: 'Explorer', xp: 100, currentLevelXp: 0, nextLevelXp: 200 },
    stats: { visitedCount: recentVisits.length, districtCoveragePercent: 10, streakCount: 1 },
    badges: [],
    recentVisits,
  }
}

function signIn() {
  writeJson('dev-user', { id: 'local-dev-user', email: null, displayName: 'Dev Traveler' })
}

function mockApi(visits: Visit[], landmarks: Landmark[] = [cross, fort]) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    const body = url.pathname === '/v1/me' ? meWith(visits) : landmarks
    return new Response(JSON.stringify({ data: body }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })
}

describe('ArchivesPage', () => {
  beforeEach(() => {
    localStorage.clear()
    resetBookmarksCache()
  })

  it('shows the bookmarks saved on landmark pages and the history from the API', async () => {
    signIn()
    writeJson('bookmarks', [bookmark(cross), bookmark(fort)])
    mockApi([visitAt(0, 10, { landmarkId: fort.id, source: 'manual', xpAwarded: 35 })])

    renderPage(<ArchivesPage />, '/archives')

    const favorites = await screen.findByRole('region', { name: /Bookmarked Landmarks/i })
    expect(within(favorites).getByRole('link', { name: "Magellan's Cross" })).toHaveAttribute('href', '/landmarks/magellans-cross')
    expect(within(favorites).getByRole('link', { name: 'Fort San Pedro' })).toHaveAttribute('href', '/landmarks/fort-san-pedro')
    expect(within(favorites).getByRole('button', { name: "Remove Magellan's Cross from bookmarks" })).toHaveAttribute('aria-pressed', 'true')

    const history = screen.getByRole('region', { name: /Visit History/i })
    expect(await within(history).findByRole('link', { name: /Fort San Pedro/ })).toHaveAttribute('href', '/landmarks/fort-san-pedro')
  })

  it('does not invent sample data for a new account', async () => {
    signIn()
    mockApi([])

    renderPage(<ArchivesPage />, '/archives')

    expect(await screen.findByText(/Your archives are empty/i)).toBeInTheDocument()
    expect(screen.queryByText("Magellan's Cross")).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /load samples|restore examples|reset sample/i })).not.toBeInTheDocument()
  })

  it('removes a bookmark and restores it with Undo', async () => {
    signIn()
    writeJson('bookmarks', [bookmark(cross)])
    mockApi([])

    renderPage(<ArchivesPage />, '/archives')

    const favorites = await screen.findByRole('region', { name: /Bookmarked Landmarks/i })
    await screen.findByText(/No activity history yet/i)
    await userEvent.click(within(favorites).getByRole('button', { name: "Remove Magellan's Cross from bookmarks" }))

    expect(within(favorites).queryByRole('link', { name: "Magellan's Cross" })).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('laagtabai:bookmarks')!)).toEqual([])

    const toast = (await screen.findByText(/Removed "Magellan's Cross" from bookmarks/)).closest(
      '[role="status"]',
    ) as HTMLElement
    expect(toast).not.toBeNull()
    await userEvent.click(within(toast).getByRole('button', { name: /^undo$/i }))

    expect(await screen.findByRole('link', { name: "Magellan's Cross" })).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('laagtabai:bookmarks')!)).toHaveLength(1)
  })

  it('keeps local bookmarks and asks signed-out visitors to sign in for history', async () => {
    writeJson('bookmarks', [bookmark(cross)])
    mockApi([])

    renderPage(<ArchivesPage />, '/archives')

    expect(await screen.findByRole('link', { name: "Magellan's Cross" })).toBeInTheDocument()
    expect(await screen.findByText('Sign in to keep a history of the places you visit.')).toBeInTheDocument()
  })

  it('labels Scanned, Visited and Viewed by icon and text', async () => {
    signIn()
    mockApi([
      visitAt(0, 12, { id: 'v-scan', landmarkId: cross.id, source: 'scan' }),
      visitAt(0, 11, { id: 'v-manual', landmarkId: fort.id, source: 'manual' }),
      visitAt(0, 10, { id: 'v-chat', landmarkId: cross.id, source: 'chat' }),
    ])

    renderPage(<ArchivesPage />, '/archives')

    const scanned = await screen.findByLabelText('Activity type: Scanned')
    const visited = screen.getByLabelText('Activity type: Visited')
    const viewed = screen.getByLabelText('Activity type: Viewed')

    expect(scanned).toHaveTextContent('Scanned')
    expect(visited).toHaveTextContent('Visited')
    expect(viewed).toHaveTextContent('Viewed')
    for (const tag of [scanned, visited, viewed]) expect(tag.querySelector('svg')).toBeInTheDocument()
  })

  it('groups history by date, newest first', async () => {
    signIn()
    mockApi([visitAt(1, 15, { id: 'v-yesterday' }), visitAt(0, 10, { id: 'v-today' })])

    renderPage(<ArchivesPage />, '/archives')

    const today = await screen.findByText('Today')
    const yesterday = screen.getByText('Yesterday')
    expect(today.compareDocumentPosition(yesterday)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('does not offer history delete or clear actions the API cannot persist', async () => {
    signIn()
    mockApi([visitAt(0, 10)])

    renderPage(<ArchivesPage />, '/archives')
    await screen.findByText('Today')

    expect(screen.queryByRole('button', { name: /clear.*history/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('shows the offline banner while the browser is offline', async () => {
    signIn()
    mockApi([])
    renderPage(<ArchivesPage />, '/archives')

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(screen.getByText(/Offline mode active/i)).toBeInTheDocument()

    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(screen.queryByText(/Offline mode active/i)).not.toBeInTheDocument()
  })

  it('offers a retry when the history request fails', async () => {
    signIn()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
      if (url.pathname === '/v1/me') {
        return new Response(JSON.stringify({ error: { code: 'unavailable', message: 'History unavailable' } }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ data: [cross, fort] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })

    renderPage(<ArchivesPage />, '/archives')

    expect(await screen.findByText('History unavailable')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('uses palette tokens instead of raw colours, so it follows the theme', async () => {
    signIn()
    mockApi([])
    const { container } = renderPage(<ArchivesPage />, '/archives')
    await screen.findByText(/Your archives are empty/i)

    const page = container.firstElementChild as HTMLElement
    expect(page).toHaveClass('bg-ivory', 'text-ink')
    expect(container.querySelector('[class*="#"]')).toBeNull()
    expect(container.querySelector('[class*="text-white"], [class*="bg-slate"]')).toBeNull()
    expect(container.querySelector('[class*="text-[10px]"], [class*="text-[11px]"]')).toBeNull()
  })
})
