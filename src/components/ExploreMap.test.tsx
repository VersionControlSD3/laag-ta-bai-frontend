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

  const { rerender } = render(<ExploreMap hidden={false} location={null} />)
  expect(screen.getByRole('status')).toHaveTextContent('Loading map')

  const script = document.querySelector<HTMLScriptElement>('script[src^="https://maps.googleapis.com/maps/api/js?"]')
  expect(script).toBeInTheDocument()
  expect(new URL(script!.src).searchParams.get('key')).toBe('test-key')

  vi.stubGlobal('google', { maps: { Map: createMap, OverlayView } })
  try {
    await act(async () => window.laagTaBaiMapsReady?.())
    expect(createMap).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({
      center: { lat: 10.299, lng: 123.899 },
      gestureHandling: 'cooperative',
    }))
    act(() => tilesLoaded?.())
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByRole('img', { name: 'Your current location' })).toBeNull()
    expect(moveCamera).not.toHaveBeenCalled()

    const location = { lat: 10.29312, lng: 123.90456 }
    rerender(<ExploreMap hidden={false} location={location} />)
    expect(project).toHaveBeenCalledWith(location)
    expect(screen.getByRole('img', { name: 'Your current location' })).toHaveStyle({ left: '25px', top: '50px' })
    const camera = { center: { lat: 10.29, lng: 123.9 }, zoom: 13 }
    expect(moveCamera).toHaveBeenCalledExactlyOnceWith(camera)
    fireEvent.click(screen.getByRole('button', { name: 'Center map on my location' }))
    expect(moveCamera).toHaveBeenNthCalledWith(2, camera)

    rerender(<ExploreMap hidden location={location} />)
    expect(screen.queryByRole('region', { name: 'Explore map' })).toBeNull()
    rerender(<ExploreMap hidden={false} location={location} />)
    expect(createMap).toHaveBeenCalledTimes(1)
    expect(moveCamera).toHaveBeenCalledTimes(2)

    rerender(<ExploreMap hidden={false} location={null} />)
    expect(screen.queryByRole('img', { name: 'Your current location' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Center map on my location' })).toBeNull()

    act(() => window.gm_authFailure?.())
    expect(screen.getByRole('status')).toHaveTextContent('Map unavailable')
  } finally {
    vi.unstubAllGlobals()
    delete window.gm_authFailure
    script?.remove()
  }
})
