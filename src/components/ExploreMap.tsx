import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import type { LandmarkSummary } from '@/api/types'
import {
  CloseOutlineIcon,
  ContractOutlineIcon,
  ExpandOutlineIcon,
  FlagIcon,
  LocateOutlineIcon,
} from '@/components/icons/ionicons'
import { LandmarkImage, Rating } from '@/components/LandmarkCard'
import type { GeoState } from '@/hooks/useGeolocation'
import { env } from '@/lib/env'
import { CATEGORY_LABELS } from '@/lib/format'
import { loadGoogleMaps, MAPS_AUTH_FAILURE, type Bounds, type GoogleMap, type MapProjection } from '@/lib/googleMaps'

const CEBU_CITY = { lat: 10.299, lng: 123.899 }
const MAP_LOAD_TIMEOUT_MS = 15_000
const EXPLORE_ZOOM = 13
const SINGLE_LANDMARK_ZOOM = 15
const FIT_PADDING_PX = 48
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy'
const mapButton = `pointer-events-auto flex size-12 shrink-0 items-center justify-center rounded-xl bg-ivory-surface text-navy shadow-lg ${focus}`

type Location = NonNullable<GeoState['coords']>
type ExploreMapProps = {
  hidden: boolean
  landmarks: LandmarkSummary[]
  location: Location | null
  locating: boolean
  locationStatus?: GeoState['status']
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

function boundsOf(landmarks: LandmarkSummary[]): Bounds {
  const lats = landmarks.map((l) => l.latitude)
  const lngs = landmarks.map((l) => l.longitude)
  return { north: Math.max(...lats), south: Math.min(...lats), east: Math.max(...lngs), west: Math.min(...lngs) }
}

/** Frames every landmark, for when we don't know where the user is. */
function frameLandmarks(map: GoogleMap, landmarks: LandmarkSummary[]) {
  if (landmarks.length === 1) {
    map.moveCamera({ center: { lat: landmarks[0].latitude, lng: landmarks[0].longitude }, zoom: SINGLE_LANDMARK_ZOOM })
  } else {
    map.fitBounds(boundsOf(landmarks), FIT_PADDING_PX)
  }
}

export function ExploreMap({ hidden, landmarks, location, locating, locationStatus = 'idle', onRefreshLocation, theme }: ExploreMapProps) {
  const apiKey = env.googleMapsApiKey
  const container = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const framed = useRef(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>(apiKey ? 'loading' : 'unavailable')
  const [view, setView] = useState<MapView | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = landmarks.find((l) => l.id === selectedId)
  const ready = status === 'ready' && view !== null

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
    pin.setAttribute('aria-label', 'Your current location')
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
    framed.current = true
    centerNearLocation(view.map, location)
    overlay.setMap(view.map)

    return () => overlay.setMap(null)
  }, [location, status, view])

  // Without a location (denied, unavailable or not shared yet), show every landmark once.
  useEffect(() => {
    if (status !== 'ready' || !view || location || locating || framed.current || landmarks.length === 0) return
    framed.current = true
    frameLandmarks(view.map, landmarks)
  }, [landmarks, locating, location, status, view])

  // Tapping empty map closes the preview.
  useEffect(() => {
    if (!view) return
    const listener = view.map.addListener('click', () => setSelectedId(null))
    return () => listener.remove()
  }, [view])

  useEffect(() => {
    view?.map.setOptions({ gestureHandling: fullscreen ? 'greedy' : 'cooperative' })
  }, [fullscreen, view])

  useEffect(() => {
    if (!fullscreen) return
    const root = document.documentElement
    const overflow = root.style.overflow
    root.style.overflow = 'hidden'
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setFullscreen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      root.style.overflow = overflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [fullscreen])

  // The page behind the full-screen map is covered, so keep keyboard focus inside it.
  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (!fullscreen || event.key !== 'Tab' || !frame.current) return
    const focusable = [...frame.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  const preview = selected && (
    <LandmarkPreview landmark={selected} onClose={() => setSelectedId(null)} />
  )

  return (
    <section className="px-5" aria-label="Explore map" hidden={hidden}>
      <div
        ref={frame}
        role={fullscreen ? 'dialog' : undefined}
        aria-modal={fullscreen || undefined}
        aria-label={fullscreen ? 'Full-screen map' : undefined}
        onKeyDown={trapFocus}
        className={`overflow-hidden bg-sage-soft ${fullscreen
          ? 'fixed inset-0 z-50 mx-auto h-dvh max-w-md'
          : 'relative h-44 rounded-3xl border border-ivory-line shadow-card'}`}
      >
        <div ref={container} className="absolute inset-0" hidden={status === 'unavailable'} />
        {ready && (
          <LandmarkPins view={view} landmarks={landmarks} selectedId={selectedId} onSelect={setSelectedId} />
        )}
        {status !== 'ready' && (
          <p role="status" className="pointer-events-none absolute inset-0 grid place-items-center bg-sage-soft px-4 text-center text-sm font-semibold text-sage-deep">
            {status === 'loading' ? 'Loading map…' : 'Map unavailable'}
          </p>
        )}
        <div className={`pointer-events-none absolute inset-x-3 flex items-start justify-between gap-3 ${fullscreen ? 'top-[max(0.75rem,env(safe-area-inset-top))]' : 'top-3'}`}>
          {status === 'ready' && locating ? (
            <p role="status" className="flex min-w-0 items-center gap-2 rounded-full bg-ivory-surface px-3 py-2 text-sm font-semibold text-ink shadow-md">
              <span aria-hidden className="size-2 shrink-0 rounded-full bg-navy motion-safe:animate-pulse" />
              Finding your location…
            </p>
          ) : status === 'ready' && !location ? (
            <span className="flex items-center gap-1.5 rounded-full border border-ivory-line bg-ivory-surface/95 px-3 py-1.5 text-xs leading-4 font-semibold text-ink-body shadow-xs backdrop-blur-xs">
              <span aria-hidden className="size-2 shrink-0 rounded-full bg-ink-muted" />
              {locationStatus === 'denied' ? 'Location is off' : 'Location not shared'}
            </span>
          ) : <span />}
          {(ready || fullscreen) && (
            <button
              type="button"
              onClick={() => setFullscreen((v) => !v)}
              aria-label={fullscreen ? 'Close full-screen map' : 'Open full-screen map'}
              className={mapButton}
            >
              {fullscreen ? <ContractOutlineIcon size={20} aria-hidden /> : <ExpandOutlineIcon size={20} aria-hidden />}
            </button>
          )}
        </div>
        {/* Sits above Google's logo and attribution row, which must stay visible. */}
        <div className={`pointer-events-none absolute inset-x-3 flex flex-col items-end gap-3 ${fullscreen ? 'bottom-[calc(2rem+env(safe-area-inset-bottom))]' : 'bottom-8'}`}>
          {ready && location && (
            <button
              type="button"
              onClick={onRefreshLocation}
              disabled={locating}
              aria-label="Refresh and center map on my location"
              className={`${mapButton} disabled:opacity-70`}
            >
              <LocateOutlineIcon size={20} aria-hidden />
            </button>
          )}
          {fullscreen && preview && <div className="pointer-events-auto self-stretch">{preview}</div>}
        </div>
      </div>
      {!fullscreen && preview && <div className="mt-3">{preview}</div>}
    </section>
  )
}

/** Landmark pins as real buttons, drawn in the overlay pane that receives clicks. */
function LandmarkPins({ view, landmarks, selectedId, onSelect }: {
  view: MapView
  landmarks: LandmarkSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const [layer, setLayer] = useState<HTMLDivElement | null>(null)
  // A new object on every overlay draw (zoom, resize) so the pins are re-projected.
  const [projection, setProjection] = useState<{ current?: MapProjection }>({})

  useEffect(() => {
    const element = document.createElement('div')
    element.setAttribute('role', 'group')
    element.setAttribute('aria-label', 'Landmarks on the map')
    const overlay = new view.OverlayView()
    overlay.onAdd = () => {
      view.OverlayView.preventMapHitsAndGesturesFrom?.(element)
      overlay.getPanes()?.overlayMouseTarget.append(element)
      setLayer(element)
    }
    overlay.draw = () => {
      setProjection({ current: overlay.getProjection() })
    }
    overlay.onRemove = () => {
      element.remove()
      setLayer(null)
    }
    overlay.setMap(view.map)
    return () => overlay.setMap(null)
  }, [view])

  if (!layer) return null
  // The selected pin is drawn last so it sits on top of its neighbours.
  const ordered = [...landmarks].sort((a, b) => Number(a.id === selectedId) - Number(b.id === selectedId))
  return createPortal(
    ordered.map((landmark) => {
      const position = projection.current?.fromLatLngToDivPixel({ lat: landmark.latitude, lng: landmark.longitude })
      if (!position) return null
      const active = landmark.id === selectedId
      return (
        <button
          key={landmark.id}
          type="button"
          onClick={() => onSelect(landmark.id)}
          aria-label={landmark.name}
          aria-pressed={active}
          style={{ left: position.x, top: position.y }}
          className={`absolute flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full ${focus}`}
        >
          <span
            aria-hidden
            className={`grid place-items-center rounded-full border-2 border-ivory-surface shadow-md transition-transform ${active
              ? 'size-11 bg-terracotta-ink text-ivory-surface ring-2 ring-terracotta-ink ring-offset-2 ring-offset-ivory-surface'
              : 'size-8 bg-navy text-on-navy'}`}
          >
            <FlagIcon size={active ? 20 : 14} />
          </span>
        </button>
      )
    }),
    layer,
  )
}

function LandmarkPreview({ landmark, onClose }: { landmark: LandmarkSummary; onClose: () => void }) {
  return (
    // Close sits in the corner so, at large text sizes, the details can wrap below the photo.
    <div className="relative flex flex-wrap items-center gap-3 rounded-2xl border border-ivory-line bg-ivory-surface p-3 pr-14 shadow-lg">
      {/* The name is the link's text, so the photo is decorative here. */}
      <LandmarkImage src={landmark.imageUrl} alt="" className="size-16 shrink-0 rounded-xl" />
      <div className="flex min-w-28 flex-1 flex-col items-start gap-1">
        {/* The link's ::after covers the card, so tapping anywhere but Close opens the landmark. */}
        <Link
          to={`/landmarks/${landmark.id}`}
          className={`text-base leading-6 font-bold wrap-break-word text-ink after:absolute after:inset-0 after:rounded-2xl ${focus}`}
        >
          {landmark.name}
          <span className="sr-only">, view details</span>
        </Link>
        <p className="flex flex-wrap items-center gap-x-2 text-xs leading-4 text-ink-muted">
          {landmark.district}
          <Rating value={landmark.rating} />
        </p>
        <span className="rounded-md bg-terracotta-soft px-2 py-1 text-[0.625rem] leading-[0.875rem] font-bold tracking-wide text-terracotta-ink uppercase">
          {CATEGORY_LABELS[landmark.category]}
        </span>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={`Close ${landmark.name} preview`}
        className={`absolute top-1 right-1 z-10 flex size-12 items-center justify-center rounded-xl text-ink-muted ${focus}`}
      >
        <CloseOutlineIcon size={20} aria-hidden />
      </button>
    </div>
  )
}
