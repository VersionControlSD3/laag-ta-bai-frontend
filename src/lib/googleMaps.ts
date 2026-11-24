type Coordinates = { lat: number; lng: number }

type MapCamera = {
  center: Coordinates
  zoom: number
}

type MapOptions = MapCamera & {
  colorScheme: 'LIGHT' | 'DARK'
  gestureHandling: 'cooperative'
  cameraControl: boolean
  fullscreenControl: boolean
  mapTypeControl: boolean
  streetViewControl: boolean
  zoomControl: boolean
  zoomControlOptions: { position: number }
}

export type GoogleMap = {
  addListener(event: 'tilesloaded', listener: () => void): { remove: () => void }
  moveCamera(camera: MapCamera): void
}

type MapsLibrary = {
  ControlPosition: { INLINE_START_BLOCK_END: number }
  Map: new (element: HTMLElement, options: MapOptions) => GoogleMap
  OverlayView: new () => {
    onAdd(): void
    draw(): void
    onRemove(): void
    setMap(map: GoogleMap | null): void
    getPanes(): { overlayLayer: Element } | undefined
    getProjection(): { fromLatLngToDivPixel(coords: Coordinates): { x: number; y: number } | null } | undefined
  }
}

declare global {
  interface Window {
    google?: { maps?: MapsLibrary }
    laagTaBaiMapsReady?: () => void
    gm_authFailure?: () => void
  }
}

export const MAPS_AUTH_FAILURE = 'laagtabai:maps-auth-failure'

let loading: Promise<MapsLibrary> | undefined
let authenticationFailed = false

export function loadGoogleMaps(apiKey: string): Promise<MapsLibrary> {
  if (authenticationFailed) return Promise.reject(new Error('Google Maps authentication failed.'))
  if (loading) return loading

  loading = new Promise<MapsLibrary>((resolve, reject) => {
    const script = document.createElement('script')
    const url = new URL('https://maps.googleapis.com/maps/api/js')
    url.search = new URLSearchParams({
      key: apiKey,
      loading: 'async',
      callback: 'laagTaBaiMapsReady',
      v: 'quarterly',
    }).toString()

    function fail(error: Error) {
      delete window.laagTaBaiMapsReady
      script.remove()
      reject(error)
    }

    window.gm_authFailure = () => {
      authenticationFailed = true
      window.dispatchEvent(new Event(MAPS_AUTH_FAILURE))
      fail(new Error('Google Maps authentication failed.'))
    }
    window.laagTaBaiMapsReady = () => {
      const maps = window.google?.maps
      if (!maps?.Map || !maps.OverlayView) {
        fail(new Error('Google Maps did not provide the map and overlay constructors.'))
        return
      }
      delete window.laagTaBaiMapsReady
      resolve(maps)
    }

    script.async = true
    script.src = url.toString()
    script.onerror = () => fail(new Error('Google Maps could not load.'))
    document.head.append(script)
  }).catch((error) => {
    loading = undefined
    throw error
  })

  return loading
}
