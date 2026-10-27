import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LandmarkSummary } from '@/api/types'
import { mockFetch, renderPage } from '@/test/render'
import ExplorePage from './ExplorePage'

const casa: LandmarkSummary = {
  id: 'casa-gorordo',
  name: 'Casa Gorordo',
  category: 'museum',
  district: 'Parian',
  latitude: 10.3,
  longitude: 123.9,
  imageUrl: null,
  admissionFee: 0,
  rating: 4.7,
  visitCount: 3,
  estimatedVisitMinutes: 45,
  visitingHours: '9:00 AM - 5:00 PM',
  distanceMeters: 400,
}

function mockGeolocation(result: 'granted' | 'denied') {
  vi.stubGlobal('navigator', {
    ...navigator,
    geolocation: {
      getCurrentPosition: (ok: PositionCallback, fail: PositionErrorCallback) =>
        result === 'granted'
          ? ok({ coords: { latitude: 10.29, longitude: 123.9 } } as GeolocationPosition)
          : fail({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError),
    },
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('ExplorePage', () => {
  it('explains location use before asking, then shows nearby landmarks with distances', async () => {
    mockGeolocation('granted')
    mockFetch(() => ({ data: [casa] }))
    renderPage(<ExplorePage />)

    expect(screen.getByText(/sent to our server only to sort nearby landmarks and verify scans/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Recenter on my location' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Share location' }))
    expect(screen.getByRole('img', { name: /navy pin marks your current location/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recenter on my location' })).toBeInTheDocument()

    const nearby = screen.getByRole('region', { name: 'Nearby You' })
    expect(await within(nearby).findByRole('link', { name: /Casa Gorordo/ })).toHaveTextContent('400 m')
    expect(within(screen.getByRole('region', { name: 'Popular Landmarks' })).getByRole('link', { name: /Casa Gorordo/ })).toBeInTheDocument()
  })

  it('shows the permission-denied state with a way to retry', async () => {
    mockGeolocation('denied')
    mockFetch(() => ({ data: [casa] }))
    renderPage(<ExplorePage />)

    await userEvent.click(screen.getByRole('button', { name: 'Share location' }))
    expect(screen.getByText('Location is off', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Map of Cebu. Location is off.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('shows an empty state when a search has no matches', async () => {
    mockFetch((url) => ({ data: url.searchParams.get('q') ? [] : [casa] }))
    renderPage(<ExplorePage />)

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search landmarks' }), 'zzz')
    expect(await screen.findByText('No matches')).toBeInTheDocument()
  })
})
