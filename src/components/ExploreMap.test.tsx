import { act, fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { ExploreMap } from './ExploreMap'

vi.mock('@/lib/env', () => ({ env: { googleMapsApiKey: 'test-key' } }))

it('loads once, draws the permitted location, and falls back if Google rejects authentication', async () => {
  const remove = vi.fn()
  const moveCamera = vi.fn()
  const project = vi.fn(() => ({ x: 25, y: 50 }))
  let mapElement: HTMLElement
  let tilesLoaded: (() => void) | undefined
  const createMap = vi.fn(function (element: HTMLElement) {
    mapElement = element
    return {
      moveCamera,
      addListener: (_event: string, listener: () => void) => {
        tilesLoaded = listener
        return { remove }
      },
    }
  })
  class OverlayView {
    onAdd = () => {}
    draw = () => {}
    onRemove = () => {}

    setMap(map: unknown) {
      if (map) {
        this.onAdd()
        this.draw()
      } else {
        this.onRemove()
      }
    }

    getPanes() { return { overlayLayer: mapElement } }
    getProjection() { return { fromLatLngToDivPixel: project } }
  }

  const onRefreshLocation = vi.fn()
  const props = { hidden: false, location: null, locating: false, onRefreshLocation, theme: 'dark' as const }
  const { rerender } = render(<ExploreMap {...props} />)
  expect(screen.getByRole('status')).toHaveTextContent('Loading map')

  const script = document.querySelector<HTMLScriptElement>('script[src^="https://maps.googleapis.com/maps/api/js?"]')
  expect(script).toBeInTheDocument()
  expect(new URL(script!.src).searchParams.get('key')).toBe('test-key')

  vi.stubGlobal('google', { maps: {
    Map: createMap,
    OverlayView,
    ControlPosition: { INLINE_START_BLOCK_END: 4 },
  } })
  try {
    await act(async () => window.laagTaBaiMapsReady?.())
    expect(createMap).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({
      center: { lat: 10.299, lng: 123.899 },
      colorScheme: 'DARK',
      gestureHandling: 'cooperative',
      zoomControlOptions: { position: 4 },
    }))
    act(() => tilesLoaded?.())
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
    expect(createMap).toHaveBeenCalledTimes(1)
    expect(moveCamera).toHaveBeenCalledTimes(2)

    rerender(<ExploreMap {...props} />)
    expect(screen.queryByRole('img', { name: 'Your current location' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Refresh and center map on my location' })).toBeNull()

    act(() => window.gm_authFailure?.())
    expect(screen.getByRole('status')).toHaveTextContent('Map unavailable')
  } finally {
    vi.unstubAllGlobals()
    delete window.gm_authFailure
    script?.remove()
  }
})
