// SRS 3.1.1.1.c: JPEG, PNG or HEIC, at least 720p, before upload.
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif']
export const MIN_SHORT_SIDE = 720
export const MIN_LONG_SIDE = 1280
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

/** `reason` is a key of `t.common.image`, so the screen shows it in the current language. */
export type ImageCheck = { ok: true } | { ok: false; reason: 'type' | 'size' | 'dimensions' }

export function checkImageMeta(
  file: Pick<File, 'type' | 'size' | 'name'>,
  dimensions: { width: number; height: number } | null,
): ImageCheck {
  const type = file.type || (/\.(heic|heif)$/i.test(file.name) ? 'image/heic' : '')
  if (!ACCEPTED_IMAGE_TYPES.includes(type)) return { ok: false, reason: 'type' }
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, reason: 'size' }
  if (dimensions) {
    const short = Math.min(dimensions.width, dimensions.height)
    const long = Math.max(dimensions.width, dimensions.height)
    if (short < MIN_SHORT_SIDE || long < MIN_LONG_SIDE) {
      return { ok: false, reason: 'dimensions' }
    }
  }
  return { ok: true }
}

/** Reads pixel dimensions. Returns null when the browser can't decode the format (e.g. HEIC outside Safari). */
export async function readDimensions(file: Blob): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  } catch {
    return null
  }
}

export async function validateImage(file: File): Promise<ImageCheck> {
  const basic = checkImageMeta(file, null)
  if (!basic.ok) return basic
  return checkImageMeta(file, await readDimensions(file))
}
