import { useCallback, useState } from 'react'
import { readJson, writeJson } from '@/lib/storage'

export type GeoState = {
  status: 'idle' | 'locating' | 'ready' | 'denied' | 'unavailable'
  coords: { lat: number; lng: number } | null
  error: string | null
}

export const GRANTED_KEY = 'location-rationale-accepted'

/**
 * Location is requested only after the traveler accepts an in-app rationale
 * (SRS 3.5.3.1). Coordinates stay in the browser and are sent to the API only
 * for distance sorting and scan verification (SRS 3.5.3.2).
 */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: 'idle', coords: null, error: null })
  const rationaleAccepted = readJson(GRANTED_KEY, false)

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'unavailable', coords: null, error: 'Location is not supported on this device.' })
      return
    }
    writeJson(GRANTED_KEY, true)
    setState((s) => ({ ...s, status: 'locating' }))
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setState({
          status: 'ready',
          coords: { lat: position.coords.latitude, lng: position.coords.longitude },
          error: null,
        }),
      (error) =>
        setState({
          status: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable',
          coords: null,
          error: error.code === error.PERMISSION_DENIED ? 'Location permission was denied.' : 'Could not get your location.',
        }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }, [])

  return { ...state, rationaleAccepted, request }
}
