import { act, fireEvent, render, screen, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { LandmarkSummary } from '@/api/types'

vi.mock('@/lib/env', () => ({ env: { googleMapsApiKey: 'test-key' } }))

// The loader caches the script and remembers auth failures, so every test gets a fresh module.
let ExploreMap: typeof import('./ExploreMap').ExploreMap
beforeEach(async () => {
  vi.resetModules()
  ;({ ExploreMap } = await import('./ExploreMap'))
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete window.gm_authFailure
  delete window.laagTaBaiMapsReady
  document.querySelectorAll('script[src^="https://maps.googleapis.com/"]').forEach((s) => s.remove())
})

const landmark = (id: string, name: string, latitude: number, longitude: number): LandmarkSummary => ({
  id,
  name,
  category: 'museum',
  district: 'Parian',
  latitude,
  longitude,
  imageUrl: null,
  admissionFee: 0,
  rating: 4.7,
  visitCount: 3,
  estimatedVisitMinutes: 45,
  visitingHours: '9:00 AM - 5:00 PM',
})
const casa = landmark('casa-gorordo', 'Casa Gorordo', 10.2988, 123.9035)
const fort = landmark('fort-san-pedro', 'Fort San Pedro', 10.2925, 123.9058)

/** Installs a fake `google.maps` and returns the spies. */
function fakeGoogleMaps() {
  const listeners: Record<string, () => void> = {}
  const map = {
    moveCamera: vi.fn(),
    fitBounds: vi.fn(),
    setOptions: vi.fn(),
    addListener: vi.fn((event: string, listener: () => void) => {
      listeners[event] = listener
      return { remove: vi.fn() }
    }),
  }
  const project = vi.fn(({ lat, lng }: { lat: number; lng: number }) => ({ x: Math.round(lat * 10), y: Math.round(lng) }))
  const createMap = vi.fn(function (element: HTMLElement) {
    mapElement = element
    return map
  })
  let mapElement: HTMLElement
  class OverlayView {
    static preventMapHitsAndGesturesFrom = vi.fn()
    onAdd = () => {}
    draw = () => {}
    onRemove = () => {}

    setMap(target: unknown) {
      if (target) {
        this.onAdd()
        this.draw()
      } else {
        this.onRemove()
      }
    }

    getPanes() { return { overlayLayer: mapElement, overlayMouseTarget: mapElement } }
    getProjection() { return { fromLatLngToDivPixel: project } }
  }
  vi.stubGlobal('google', { maps: { Map: createMap, OverlayView, ControlPosition: { INLINE_START_BLOCK_END: 4 } } })
  return { createMap, listeners, map, project, OverlayView }
}

type Props = ComponentProps<typeof ExploreMap>
const baseProps: Props = {
  hidden: false,
  landmarks: [],
  location: null,
  locating: false,
  onRefreshLocation: () => {},
  theme: 'light',
}

/** Renders the map in a router and lets Google "finish" loading. */
async function renderReadyMap(props: Partial<Props> = {}) {
  const google = fakeGoogleMaps()
  const element = (next: Partial<Props>) => <ExploreMap {...baseProps} {...props} {...next} />
  const router = createMemoryRouter([
    { path: '/', element: element({}) },
    { path: '/landmarks/:id', element: <h1>Landmark page</h1> },
  ])
  render(<RouterProvider router={router} />)
  await act(async () => window.laagTaBaiMapsReady?.())
  act(() => google.listeners.tilesloaded?.())
  return { ...google, router }
}

it('loads once, draws the permitted location, and falls back if Google rejects authentication', async () => {
  const google = fakeGoogleMaps()
  const { moveCamera } = google.map
  const project = google.project.mockImplementation(() => ({ x: 25, y: 50 }))

  const onRefreshLocation = vi.fn()
  const props = { ...baseProps, onRefreshLocation, theme: 'dark' as const }
  const { rerender } = render(<ExploreMap {...props} />)
  expect(screen.getByRole('status')).toHaveTextContent('Loading map')

  const script = document.querySelector<HTMLScriptElement>('script[src^="https://maps.googleapis.com/maps/api/js?"]')
  expect(script).toBeInTheDocument()
  expect(new URL(script!.src).searchParams.get('key')).toBe('test-key')

  await act(async () => window.laagTaBaiMapsReady?.())
  expect(google.createMap).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({
    center: { lat: 10.299, lng: 123.899 },
    colorScheme: 'DARK',
    gestureHandling: 'cooperative',
    zoomControlOptions: { position: 4 },
  }))
  act(() => google.listeners.tilesloaded?.())
  expect(screen.queryByRole('status')).toBeNull()
  expect(screen.queryByRole('img', { name: 'Your current location' })).toBeNull()
  expect(moveCamera).not.toHaveBeenCalled()

  const location = { lat: 10.29312, lng: 123.90456 }
  rerender(<ExploreMap {...props} locating />)
  expect(screen.getByRole('status')).toHaveTextContent('Finding your location')

  rerender(<ExploreMap {...props} location={location} />)
  expect(project).toHaveBeenCalledWith(location)
  expect(screen.getByRole('img', { name: 'Your current location' })).toHaveStyle({ left: '25px', top: '50px' })
  const camera = { center: { lat: 10.29, lng: 123.9 }, zoom: 13 }
  expect(moveCamera).toHaveBeenCalledExactlyOnceWith(camera)
  const refreshButton = () => screen.getByRole('button', { name: 'Refresh and center map on my location' })
  fireEvent.click(refreshButton())
  expect(onRefreshLocation).toHaveBeenCalledTimes(1)
  rerender(<ExploreMap {...props} location={location} locating />)
  expect(refreshButton()).toBeDisabled()
  expect(screen.getByRole('status')).toHaveTextContent('Finding your location')
  expect(moveCamera).toHaveBeenCalledTimes(1)

  const refreshedLocation = { lat: 10.3178, lng: 123.9212 }
  rerender(<ExploreMap {...props} location={refreshedLocation} />)
  expect(moveCamera).toHaveBeenNthCalledWith(2, { center: { lat: 10.32, lng: 123.92 }, zoom: 13 })
  expect(project).toHaveBeenLastCalledWith(refreshedLocation)

  rerender(<ExploreMap {...props} hidden location={refreshedLocation} />)
  expect(screen.queryByRole('region', { name: 'Explore map' })).toBeNull()
  rerender(<ExploreMap {...props} location={refreshedLocation} />)
  expect(google.createMap).toHaveBeenCalledTimes(1)
  expect(moveCamera).toHaveBeenCalledTimes(2)

  rerender(<ExploreMap {...props} />)
  expect(screen.queryByRole('img', { name: 'Your current location' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Refresh and center map on my location' })).toBeNull()

  act(() => window.gm_authFailure?.())
  expect(screen.getByRole('status')).toHaveTextContent('Map unavailable')
})

it('opens and exits full-screen mode, keeping the location pin and recenter control', async () => {
  const onRefreshLocation = vi.fn()
  const { map } = await renderReadyMap({ location: { lat: 10.29, lng: 123.9 }, onRefreshLocation })
  expect(screen.queryByRole('dialog')).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: 'Open full-screen map' }))
  const dialog = screen.getByRole('dialog', { name: 'Full-screen map' })
  expect(dialog).toHaveClass('fixed', 'inset-0', 'h-dvh')
  expect(document.documentElement.style.overflow).toBe('hidden')
  expect(map.setOptions).toHaveBeenLastCalledWith({ gestureHandling: 'greedy' })
  expect(within(dialog).getByRole('img', { name: 'Your current location' })).toBeInTheDocument()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Refresh and center map on my location' }))
  expect(onRefreshLocation).toHaveBeenCalledTimes(1)

  fireEvent.click(within(dialog).getByRole('button', { name: 'Close full-screen map' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(document.documentElement.style.overflow).toBe('')
  expect(map.setOptions).toHaveBeenLastCalledWith({ gestureHandling: 'cooperative' })

  fireEvent.click(screen.getByRole('button', { name: 'Open full-screen map' }))
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('button', { name: 'Open full-screen map' })).toBeInTheDocument()
})

it('pins every landmark and previews the tapped one with a link to its page', async () => {
  const { listeners, OverlayView, router } = await renderReadyMap({ landmarks: [casa, fort] })

  const pins = within(screen.getByRole('group', { name: 'Landmarks on the map' }))
  expect(pins.getAllByRole('button')).toHaveLength(2)
  expect(OverlayView.preventMapHitsAndGesturesFrom).toHaveBeenCalled()
  const casaPin = pins.getByRole('button', { name: 'Casa Gorordo' })
  expect(casaPin).toHaveStyle({ left: '103px', top: '124px' })
  expect(casaPin).toHaveAttribute('aria-pressed', 'false')

  fireEvent.click(casaPin)
  expect(casaPin).toHaveAttribute('aria-pressed', 'true')
  const preview = screen.getByRole('link', { name: 'Casa Gorordo, view details' })
  expect(preview).toHaveAttribute('href', '/landmarks/casa-gorordo')
  expect(screen.getByText('Museum')).toBeInTheDocument()
  expect(screen.getByText('Parian')).toBeInTheDocument()
  expect(screen.getByText('4.7')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Close Casa Gorordo preview' }))
  expect(screen.queryByRole('link', { name: /view details/ })).toBeNull()

  fireEvent.click(pins.getByRole('button', { name: 'Fort San Pedro' }))
  act(() => listeners.click?.())
  expect(screen.queryByRole('link', { name: /view details/ })).toBeNull()

  // The preview also works in full-screen mode, inside the dialog.
  fireEvent.click(screen.getByRole('button', { name: 'Open full-screen map' }))
  fireEvent.click(pins.getByRole('button', { name: 'Fort San Pedro' }))
  const link = within(screen.getByRole('dialog')).getByRole('link', { name: 'Fort San Pedro, view details' })
  fireEvent.click(link)
  expect(router.state.location.pathname).toBe('/landmarks/fort-san-pedro')
  expect(await screen.findByRole('heading', { name: 'Landmark page' })).toBeInTheDocument()
})

it('frames all landmarks when there is no location, but waits while locating', async () => {
  const locating = await renderReadyMap({ landmarks: [casa, fort], locating: true })
  expect(locating.map.fitBounds).not.toHaveBeenCalled()
})

it('fits the map to the landmarks when location is off', async () => {
  const { map } = await renderReadyMap({ landmarks: [casa, fort] })
  expect(map.fitBounds).toHaveBeenCalledExactlyOnceWith(
    { north: 10.2988, south: 10.2925, east: 123.9058, west: 123.9035 },
    48,
  )
  expect(map.moveCamera).not.toHaveBeenCalled()
})
