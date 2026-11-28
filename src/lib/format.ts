import type { LandmarkCategory } from '@/api/types'

export function formatDistance(meters?: number): string | null {
  if (meters === undefined) return null
  // Non-breaking space keeps the number and unit on one line at large font sizes.
  return meters < 1000 ? `${meters}\u00a0m` : `${(meters / 1000).toFixed(1)}\u00a0km`
}

/** `freeLabel` comes from the current language (`t.common.free`). */
export function formatFee(fee: number, freeLabel = 'Free'): string {
  return fee === 0 ? freeLabel : `₱${fee.toLocaleString('en-PH')}`
}

/** Category ids in display order; their labels are in `t.common.categories`. */
export const CATEGORIES: LandmarkCategory[] = ['church', 'fort', 'monument', 'museum', 'heritage_house', 'temple']
