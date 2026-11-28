import { useEffect, useRef, useState } from 'react'
import { LocateOutlineIcon } from '@/components/icons/ionicons'
import type { GeoState } from '@/hooks/useGeolocation'
import { useT } from '@/i18n'
import { env } from '@/lib/env'
import { loadGoogleMaps, MAPS_AUTH_FAILURE, type GoogleMap } from '@/lib/googleMaps'

const CEBU_CITY = { lat: 10.299, lng: 123.899 }
const MAP_LOAD_TIMEOUT_MS = 15_000
const EXPLORE_ZOOM = 13

type Location = NonNullable<GeoState['coords']>
type ExploreMapProps = {
  hidden: boolean
  location: Location | null
  locating: boolean
  onRefreshLocation: () => void
  theme: 'light' | 'dark'
}

type MapView = {
  map: GoogleMap
  OverlayView: Awaited<ReturnType<typeof loadGoogleMaps>>['OverlayView']
}

function centerNearLocation(map: GoogleMap, location: Location) {
  // Request tiles for a rounded area. The pin is positioned precisely in the browser.
  map.moveCamera({
    center: { lat: Math.round(location.lat * 100) / 100, lng: Math.round(location.lng * 100) / 100 },
    zoom: EXPLORE_ZOOM,
  })
}

export function ExploreMap({ hidden, location, locating, onRefreshLocation, theme }: ExploreMapProps) {
  const apiKey = env.googleMapsApiKey
  const t = useT().explore.map
  const container = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>(apiKey ? 'loading' : 'unavailable')
  const [view, setView] = useState<MapView | null>(null)

  useEffect(() => {
    if (hidden || status !== 'loading') return
    const loadTimeout = window.setTimeout(() => setStatus('unavailable'), MAP_LOAD_TIMEOUT_MS)
    return () => window.clearTimeout(loadTimeout)
  }, [hidden, status])

  useEffect(() => {
    const host = container.current
    if (!apiKey || !host) return

    let active = true
    let tilesListener: { remove: () => void } | undefined
    const showUnavailable = () => {
      if (active) setStatus('unavailable')
    }
    window.addEventListener(MAPS_AUTH_FAILURE, showUnavailable)

    // Google owns the nodes inside this host for the lifespan of the map.
    const element = document.createElement('div')
    element.className = 'size-full'
    host.append(element)

    void loadGoogleMaps(apiKey).then(({ ControlPosition, Map, OverlayView }) => {
      if (!active) return
      const map = new Map(element, {
        center: CEBU_CITY,
        zoom: EXPLORE_ZOOM,
        colorScheme: theme === 'dark' ? 'DARK' : 'LIGHT',
        gestureHandling: 'cooperative',
        cameraControl: false,
        fullscreenControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        zoomControl: true,
        zoomControlOptions: { position: ControlPosition.INLINE_START_BLOCK_END },
      })
      tilesListener = map.addListener('tilesloaded', () => {
        tilesListener?.remove()
        tilesListener = undefined
        if (active) {
          setView({ map, OverlayView })
          setStatus((current) => current === 'loading' ? 'ready' : current)
        }
      })
    }).catch(showUnavailable)

    return () => {
      active = false
      tilesListener?.remove()
      window.removeEventListener(MAPS_AUTH_FAILURE, showUnavailable)
      element.remove()
    }
  }, [apiKey, theme])

  useEffect(() => {
    if (status !== 'ready' || !view || !location) return

    const pin = document.createElement('span')
    pin.className = 'pointer-events-none absolute h-9 w-8 -translate-x-1/2 -translate-y-full'
    pin.setAttribute('role', 'img')
    pin.setAttribute('aria-label', t.you)
    const pinBody = document.createElement('span')
    pinBody.className = 'absolute bottom-1 left-1/2 grid size-7 -translate-x-1/2 -rotate-45 place-items-center rounded-t-full rounded-br-full rounded-bl-sm border-2 border-ivory-surface bg-danger shadow-md'
    const pinCenter = document.createElement('span')
    pinCenter.className = 'size-2 rounded-full bg-ivory-surface'
    pinBody.append(pinCenter)
    pin.append(pinBody)
    const overlay = new view.OverlayView()
    overlay.onAdd = () => overlay.getPanes()?.overlayLayer.append(pin)
    overlay.draw = () => {
      const position = overlay.getProjection()?.fromLatLngToDivPixel(location)
      pin.hidden = !position
      if (position) {
        pin.style.left = `${position.x}px`
        pin.style.top = `${position.y}px`
      }
    }
    overlay.onRemove = () => pin.remove()
    centerNearLocation(view.map, location)
    overlay.setMap(view.map)

    return () => overlay.setMap(null)
  }, [location, status, view, t.you])

  return (
    <section className="px-6" aria-label={t.label} hidden={hidden}>
      <div className="relative h-56 overflow-hidden rounded-3xl border border-ivory-line bg-sage-soft shadow-lg">
        <div ref={container} className="absolute inset-0" hidden={status === 'unavailable'} />
        {status !== 'ready' && (
          <p role="status" className="pointer-events-none absolute inset-0 grid place-items-center bg-sage-soft px-4 text-center text-sm font-semibold text-sage-deep">
            {status === 'loading' ? t.loading : t.unavailable}
          </p>
        )}
        {status === 'ready' && locating && (
          <p role="status" className="pointer-events-none absolute top-3 left-1/2 flex w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-ivory-surface px-3 py-2 text-sm font-semibold text-ink shadow-md">
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-navy motion-safe:animate-pulse" />
            {t.finding}
          </p>
        )}
        {status === 'ready' && view && location && (
          <button
            type="button"
            onClick={onRefreshLocation}
            disabled={locating}
            aria-label={t.recenter}
            className="absolute right-3 bottom-8 flex size-12 items-center justify-center rounded-xl bg-ivory-surface text-navy shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:opacity-70"
          >
            <LocateOutlineIcon size={20} aria-hidden />
          </button>
        )}
      </div>
    </section>
  )
}
