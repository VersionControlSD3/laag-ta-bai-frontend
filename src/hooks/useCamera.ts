import { useCallback, useEffect, useRef, useState } from 'react'

export type CameraStatus = 'starting' | 'live' | 'stopped' | 'denied' | 'unavailable' | 'error'
type Facing = 'environment' | 'user'

/**
 * Live in-app camera for Scan-to-Story (SRS 3.1.1.1) using getUserMedia, so the traveler never
 * leaves the app. Asks for 1080p so captures pass the 720p minimum in `lib/image.ts`.
 */
export function useCamera() {
  const video = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<CameraStatus>('starting')
  const [facing, setFacing] = useState<Facing>('environment')
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const stream = useRef<MediaStream | null>(null)

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
    setTorchOn(false)
  }, [])

  const start = useCallback(async () => {
    stop()
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable')
      return
    }
    setStatus('starting')
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      stream.current = media
      if (video.current) {
        video.current.srcObject = media
        await video.current.play().catch(() => undefined)
      }
      const capabilities = media.getVideoTracks()[0]?.getCapabilities?.() as { torch?: boolean } | undefined
      setTorchSupported(Boolean(capabilities?.torch))
      setStatus('live')
    } catch (error) {
      const name = error instanceof DOMException ? error.name : ''
      if (name === 'NotAllowedError' || name === 'SecurityError') setStatus('denied')
      else if (name === 'NotFoundError' || name === 'OverconstrainedError') setStatus('unavailable')
      else setStatus('error')
    }
  }, [facing, stop])

  const pause = useCallback(() => {
    stop()
    setStatus('stopped')
  }, [stop])

  useEffect(() => {
    // Starting the stream is the external system this effect syncs with.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void start()
    return stop
  }, [start, stop])

  const toggleTorch = async () => {
    const track = stream.current?.getVideoTracks()[0]
    if (!track) return
    const next = !torchOn
    await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] }).catch(() => undefined)
    setTorchOn(next)
  }

  /** Grabs the current frame as a JPEG file. */
  const capture = async (): Promise<File | null> => {
    const el = video.current
    if (!el || !el.videoWidth) return null
    const canvas = document.createElement('canvas')
    canvas.width = el.videoWidth
    canvas.height = el.videoHeight
    canvas.getContext('2d')?.drawImage(el, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
    return blob ? new File([blob], 'scan.jpg', { type: 'image/jpeg' }) : null
  }

  return {
    /** Attach to the preview `<video>`. */
    video,
    status,
    facing,
    torchSupported,
    torchOn,
    start,
    pause,
    capture,
    toggleTorch,
    switchCamera: () => setFacing((f) => (f === 'environment' ? 'user' : 'environment')),
  }
}
