import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Landmark, ScanResult } from '@/api/types'
import { writeJson } from '@/lib/storage'
import { routes } from '@/routes'
import { mockFetch, renderRoutes } from '@/test/render'

const cross: Landmark = {
  id: 'magellans-cross',
  name: "Magellan's Cross",
  category: 'monument',
  district: 'Plaza Sugbo, Cebu City',
  latitude: 10.29,
  longitude: 123.9,
  imageUrl: null,
  admissionFee: 0,
  rating: 4.7,
  visitCount: 10,
  estimatedVisitMinutes: 20,
  visitingHours: '8:00 AM - 7:00 PM',
  story: { about: 'A cross from 1521.', significance: 'Early encounter.', architecture: 'Octagonal kiosk.', trivia: 'Look up.' },
}
const { story: _story, ...crossSummary } = cross
const basilica = { ...crossSummary, id: 'basilica', name: 'Basilica del Santo Niño', distanceMeters: 80 }

const photo = () => new File(['x'], 'landmark.jpg', { type: 'image/jpeg' })

async function upload() {
  await screen.findByRole('button', { name: 'Choose from gallery' })
  fireEvent.change(screen.getByTestId('gallery-input'), { target: { files: [photo()] } })
}

function scanReturns(result: Partial<ScanResult>) {
  mockFetch((url) =>
    url.pathname === '/v1/scan'
      ? { data: { status: 'identified', confidence: 0.9, landmark: null, candidates: [], progress: null, ...result } }
      : { data: cross },
  )
}

beforeEach(() => {
  writeJson('preferences', { onboarded: true })
  URL.createObjectURL = vi.fn(() => 'blob:photo')
  URL.revokeObjectURL = vi.fn()
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
})

describe('ScanPage', () => {
  it('opens full screen without the tab bar and offers other ways in when there is no camera', async () => {
    renderRoutes(routes, '/scan')
    expect(await screen.findByRole('heading', { name: 'We can’t open the camera' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload a photo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scan landmark' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Close camera' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
  })

  it('explains how to turn the camera back on when permission is denied', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError'))
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
    renderRoutes(routes, '/scan')
    expect(await screen.findByRole('heading', { name: 'Camera access is off' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(getUserMedia).toHaveBeenCalledTimes(2)
  })

  it('shows the processing state and lets the traveler cancel it', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))),
    )
    renderRoutes(routes, '/scan')
    await upload()
    expect(await screen.findByText('bAI is identifying…')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Your photo' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText('bAI is identifying…')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scan landmark' })).toBeInTheDocument()
  })

  it('goes straight to the story with the match score on a confident match', async () => {
    scanReturns({ status: 'identified', confidence: 0.98, landmark: cross })
    renderRoutes(routes, '/scan')
    await upload()
    expect(await screen.findByRole('heading', { name: "Magellan's Cross" })).toBeInTheDocument()
    expect(screen.getByText(/Landmark matched · 98%/)).toBeInTheDocument()
  })

  it('shows the best guess with its confidence next to the photo when bAI is unsure', async () => {
    scanReturns({ status: 'low_confidence', confidence: 0.62, landmark: cross, candidates: [basilica] })
    renderRoutes(routes, '/scan')
    await upload()
    expect(await screen.findByRole('heading', { name: 'Is this the landmark?' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Your photo' })).toBeInTheDocument()
    const best = screen.getByRole('link', { name: "Magellan's Cross, 62 percent match, best match" })
    expect(best).toHaveTextContent('Best match')
    expect(best).toHaveTextContent('62% match · Medium confidence')
    expect(screen.getByRole('progressbar', { name: 'Match confidence' })).toHaveAttribute('aria-valuenow', '62')
    expect(screen.getByRole('link', { name: 'Basilica del Santo Niño' })).toHaveTextContent('80 m away')
    expect(screen.getByRole('button', { name: 'Retake photo' })).toBeInTheDocument()
  })

  it('offers retake and manual search when nothing matches', async () => {
    scanReturns({ status: 'unrecognized', confidence: 0.1 })
    renderRoutes(routes, '/scan')
    await upload()
    expect(await screen.findByRole('heading', { name: 'We couldn’t recognize this' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Search landmarks by name' })).toHaveAttribute('href', '/')
    await userEvent.click(screen.getByRole('button', { name: 'Retake photo' }))
    expect(await screen.findByRole('button', { name: 'Scan landmark' })).toBeInTheDocument()
  })

  it('shows the error and retries with the same photo', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ error: { code: 'bad_request', message: 'Unsupported image format.' } }), { status: 400 }))
    renderRoutes(routes, '/scan')
    await upload()
    expect(await screen.findByRole('heading', { name: 'We couldn’t scan that' })).toBeInTheDocument()
    expect(screen.getByText('Unsupported image format.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await screen.findByRole('heading', { name: 'We couldn’t scan that' })
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
