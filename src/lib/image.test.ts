import { describe, expect, it } from 'vitest'
import { checkImageMeta } from './image'

const file = (type: string, size = 1000, name = 'photo') => ({ type, size, name })

describe('checkImageMeta', () => {
  it('accepts a 1280x720 JPEG', () => {
    expect(checkImageMeta(file('image/jpeg'), { width: 1280, height: 720 })).toEqual({ ok: true })
  })
  it('accepts portrait photos', () => {
    expect(checkImageMeta(file('image/png'), { width: 1080, height: 1920 }).ok).toBe(true)
  })
  it('rejects photos below 720p', () => {
    expect(checkImageMeta(file('image/jpeg'), { width: 1024, height: 768 }).ok).toBe(false)
  })
  it('rejects unsupported formats', () => {
    expect(checkImageMeta(file('image/gif'), null).ok).toBe(false)
  })
  it('recognizes HEIC by extension when the browser gives no type', () => {
    expect(checkImageMeta(file('', 1000, 'IMG_0001.HEIC'), null).ok).toBe(true)
  })
  it('rejects files over 10 MB', () => {
    expect(checkImageMeta(file('image/jpeg', 11 * 1024 * 1024), null).ok).toBe(false)
  })
})
