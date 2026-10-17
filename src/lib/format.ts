export function formatDistance(meters?: number): string | null {
  if (meters === undefined) return null
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`
}

export function formatFee(fee: number): string {
  return fee === 0 ? 'Free' : `₱${fee.toLocaleString('en-PH')}`
}

export const CATEGORY_LABELS: Record<string, string> = {
  church: 'Church',
  fort: 'Fort',
  monument: 'Monument',
  museum: 'Museum',
  heritage_house: 'Heritage House',
  temple: 'Temple',
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
}
