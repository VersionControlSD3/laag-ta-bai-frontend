import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useLandmarks, useScan } from '@/api/hooks'
import type { ScanResult } from '@/api/types'
import {
  ArrowBackIcon,
  CameraOutlineIcon,
  CameraReverseOutlineIcon,
  ImageOutlineIcon,
  LocationOutlineIcon,
  ScanOutlineIcon,
} from '@/components/icons/ionicons'
import { LandmarkRow } from '@/components/LandmarkCard'
import { ErrorMessage } from '@/components/StateMessage'
import { useGeolocation } from '@/hooks/useGeolocation'
import { ACCEPTED_IMAGE_TYPES, validateImage } from '@/lib/image'
import type { ScanMatchState } from '@/pages/LandmarkPage'

type CameraState = 'starting' | 'ready' | 'unavailable'
type FacingMode = 'environment' | 'user'

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
const sheetFocus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy'

const STATUS_COPY: Record<Exclude<ScanResult['status'], 'identified'>, string> = {
  low_confidence: "I'm not quite sure what this is. Try again with the whole structure in frame and good light.",
  not_nearby: "That looks like a landmark that isn't near you. Are you at one of these places instead?",
  unrecognized: "I couldn't recognize this landmark. Retake the photo straight on, or pick a place below.",
}

function stopStream(stream: MediaStream | null, video: HTMLVideoElement | null) {
  if (stream) {
    for (const track of stream.getTracks()) track.stop()
  }
  if (video && video.srcObject) {
    video.srcObject = null
  }
}

function hasLiveCameraSupport() {
  return typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function'
}

/** Scan-to-Story (SRS 3.1.1.1-3.1.1.2). Uses an embedded live camera stream with native file fallback. */
export default function ScanPage() {
  const navigate = useNavigate()
  const geo = useGeolocation()
  const scan = useScan()
  const suggested = useLandmarks({ limit: 4 })

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)

  const [cameraState, setCameraState] = useState<CameraState>(() => (hasLiveCameraSupport() ? 'starting' : 'unavailable'))
  const [facingMode, setFacingMode] = useState<FacingMode>('environment')
  const [preview, setPreview] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showGpsInfo, setShowGpsInfo] = useState(false)

  // Manage live camera lifecycle: start when no preview is shown, stop immediately on preview/unmount/switch.
  useEffect(() => {
    const video = videoRef.current
    if (preview) {
      stopStream(streamRef.current, video)
      streamRef.current = null
      return
    }

    const mediaDevices = navigator.mediaDevices
    if (!mediaDevices?.getUserMedia) return

    let active = true

    const openCamera = async () => {
      let stream: MediaStream
      try {
        stream = await mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })
      } catch {
        try {
          stream = await mediaDevices.getUserMedia({ video: true, audio: false })
        } catch {
          if (active) setCameraState('unavailable')
          return
        }
      }

      if (!active) {
        stopStream(stream, null)
        return
      }

      streamRef.current = stream
      if (video) {
        video.srcObject = stream
        try {
          await video.play?.()
        } catch {
          // Autoplay may reject in headless or restricted environments; stream is still attached.
        }
      }
      if (active) setCameraState('ready')
    }

    void openCamera()

    return () => {
      active = false
      stopStream(streamRef.current, video)
      streamRef.current = null
    }
  }, [preview, facingMode])

  // Revoke preview blob URL on unmount.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const submitFile = useCallback(
    async (file: File) => {
      setValidationError(null)
      scan.reset()
      const check = await validateImage(file)
      if (!check.ok) {
        setValidationError(check.reason)
        return
      }
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old)
        return URL.createObjectURL(file)
      })
      scan.mutate(
        { image: file, lat: geo.coords?.lat, lng: geo.coords?.lng },
        {
          onSuccess: (result) => {
            if (result.status === 'identified' && result.landmark) {
              navigate(`/landmarks/${result.landmark.id}`, {
                state: { confidence: result.confidence } satisfies ScanMatchState,
              })
            }
          },
        },
      )
    },
    [geo.coords?.lat, geo.coords?.lng, navigate, scan],
  )

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    await submitFile(file)
  }

  const returnToLiveCamera = () => {
    setValidationError(null)
    scan.reset()
    setCameraState(hasLiveCameraSupport() ? 'starting' : 'unavailable')
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old)
      return null
    })
  }

  const switchCamera = () => {
    setCameraState('starting')
    setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))
  }

  const onTakePhoto = async () => {
    if (!preview && cameraState === 'ready') {
      const video = videoRef.current
      const width = video?.videoWidth ?? 0
      const height = video?.videoHeight ?? 0
      if (video && width > 0 && height > 0) {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height)
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
          if (blob) {
            const file = new File([blob], 'landmark-scan.jpg', { type: 'image/jpeg' })
            await submitFile(file)
            return
          }
        }
      }
    }
    cameraInput.current?.click()
  }

  const result = scan.data
  const gpsReady = geo.status === 'ready'

  return (
    <div className="bleed-under-nav flex min-h-dvh flex-col bg-ivory-surface pb-[calc(var(--nav-clearance)+1.5rem)]">
      {/* Tropical Lagoon Lens Container */}
      <section
        data-palette="light"
        aria-label="Camera viewfinder"
        className="relative -mb-5 flex flex-col gap-3 bg-linear-to-b from-[#07363c] via-[#0d5c63] to-[#094249] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-9 text-white"
      >
        {/* Top bar: Back, Lens title, GPS toggle */}
        <header className="flex items-center justify-between gap-2">
          <Link
            to="/"
            aria-label="Back to Explore"
            className={`touch-target flex size-12 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 ${focus}`}
          >
            <ArrowBackIcon size={20} />
          </Link>
          <h1 className="font-display text-lg leading-[1.375rem] font-bold tracking-tight text-[#ffb49a]">
            Laag ta bAI Lens
          </h1>
          <button
            type="button"
            onClick={() => (gpsReady ? setShowGpsInfo((v) => !v) : setShowGpsInfo((v) => !v))}
            aria-label={gpsReady ? 'GPS location active' : 'GPS location options'}
            aria-expanded={showGpsInfo}
            className={`touch-target flex h-12 shrink-0 items-center justify-center rounded-full px-1 ${focus}`}
          >
            <span
              className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] leading-3.5 font-bold transition-colors ${
                gpsReady ? 'bg-[#dcf5ee] text-[#165b52]' : 'border border-white/25 bg-white/15 text-white'
              }`}
            >
              <LocationOutlineIcon size={14} className="shrink-0" />
              GPS
            </span>
          </button>
        </header>

        {/* Viewfinder Frame */}
        <div className="relative h-[260px] w-full overflow-hidden rounded-[24px] border border-white/20 bg-[#06252a] sm:h-[300px]">
          {preview ? (
            <img src={preview} alt="Your photo" className="size-full object-cover" />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              aria-label="Live camera viewfinder"
              className={`size-full object-cover transition-opacity ${cameraState === 'ready' ? 'opacity-100' : 'opacity-0'}`}
            />
          )}

          {/* White corner framing brackets */}
          {(cameraState === 'ready' || preview) && (
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-x-7 top-14 bottom-5 flex items-center justify-center ${
                scan.isPending ? 'motion-safe:animate-pulse' : ''
              }`}
            >
              <span className="absolute top-0 left-0 size-7 rounded-tl-xl border-t-[3px] border-l-[3px] border-white/90" />
              <span className="absolute top-0 right-0 size-7 rounded-tr-xl border-t-[3px] border-r-[3px] border-white/90" />
              <span className="absolute bottom-0 left-0 size-7 rounded-bl-xl border-b-[3px] border-l-[3px] border-white/90" />
              <span className="absolute right-0 bottom-0 size-7 rounded-br-xl border-r-[3px] border-b-[3px] border-white/90" />
              {!scan.isPending && <ScanOutlineIcon size={40} className="text-white/75" />}
            </div>
          )}

          {/* Top-left & Top-right live overlays */}
          {!preview && cameraState === 'ready' && (
            <>
              <span className="pointer-events-none absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-[#0d5c63]/88 px-3 py-1.5 text-[11px] leading-3.5 font-semibold text-white backdrop-blur-xs">
                <span aria-hidden className="size-2 shrink-0 rounded-full bg-[#34d399] motion-safe:animate-pulse" />
                Live Camera
              </span>
              <button
                type="button"
                onClick={switchCamera}
                aria-label="Switch camera"
                className={`touch-target absolute top-2 right-2 flex size-12 items-center justify-center rounded-full bg-[#0d5c63]/85 text-white shadow-sm backdrop-blur-xs transition-transform active:scale-95 ${focus}`}
              >
                <CameraReverseOutlineIcon size={20} />
              </button>
            </>
          )}

          {/* Return to live camera button when viewing a captured/uploaded preview */}
          {preview && !scan.isPending && (
            <button
              type="button"
              onClick={returnToLiveCamera}
              aria-label="Return to live camera"
              className={`touch-target absolute top-2 left-2 flex h-12 items-center gap-1.5 rounded-full bg-[#0d5c63]/90 px-3.5 text-xs font-bold text-white shadow-sm backdrop-blur-xs transition-transform active:scale-95 ${focus}`}
            >
              <CameraOutlineIcon size={16} />
              Live camera
            </button>
          )}

          {/* Camera starting overlay */}
          {!preview && cameraState === 'starting' && (
            <div
              role="status"
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#06252a]/90 px-6 text-center text-white"
            >
              <span
                aria-hidden
                className="size-8 rounded-full border-2 border-white/30 border-t-white motion-safe:animate-spin"
              />
              <p className="text-sm font-semibold">Starting built-in camera…</p>
            </div>
          )}

          {/* Camera unavailable / denied fallback overlay */}
          {!preview && cameraState === 'unavailable' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-[#06252a]/90 px-6 text-center text-white">
              <ScanOutlineIcon size={40} className="text-[#ffb49a]" />
              <p className="max-w-[260px] text-sm leading-5 font-medium text-white/90">
                Built-in camera unavailable — upload a photo or pick a Cebu spot below.
              </p>
            </div>
          )}

          {/* Identifying landmark overlay */}
          {scan.isPending && (
            <div
              role="status"
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#06252a]/70 px-6 text-center text-white backdrop-blur-[2px]"
            >
              <span
                aria-hidden
                className="size-9 rounded-full border-2 border-white/30 border-t-[#ffb49a] motion-safe:animate-spin"
              />
              <p className="text-sm font-bold tracking-wide">Identifying landmark…</p>
            </div>
          )}
        </div>

        {/* Take photo & Upload controls */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => void onTakePhoto()}
            disabled={scan.isPending}
            className={`touch-target flex h-12 items-center justify-center gap-2 rounded-full bg-[#e76f51] px-4 text-sm font-bold text-[#fffbf4] shadow-sm transition-colors active:bg-[#d45d3f] disabled:opacity-60 ${focus}`}
          >
            <CameraOutlineIcon size={18} />
            Take photo
          </button>
          <button
            type="button"
            onClick={() => galleryInput.current?.click()}
            disabled={scan.isPending}
            className={`touch-target flex h-12 items-center justify-center gap-2 rounded-full border border-white/30 bg-white/16 px-4 text-sm font-bold text-white transition-colors active:bg-white/25 disabled:opacity-60 ${focus}`}
          >
            <ImageOutlineIcon size={18} />
            Upload
          </button>
        </div>

        <input
          ref={cameraInput}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          capture="environment"
          className="hidden"
          onChange={onFile}
          data-testid="camera-input"
        />
        <input
          ref={galleryInput}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          className="hidden"
          onChange={onFile}
          data-testid="gallery-input"
        />
      </section>

      {/* Overlapping Bottom Sheet */}
      <div className="relative z-10 flex flex-1 flex-col gap-4 rounded-t-[28px] bg-ivory-surface px-5 pt-3.5">
        <div aria-hidden className="mx-auto h-1 w-9 rounded-full bg-ivory-line" />

        {/* Opt-in GPS rationale card */}
        {(geo.status !== 'ready' || showGpsInfo) && (
          <div className="flex flex-col gap-2 rounded-[20px] border border-ivory-line bg-ivory-deep/60 px-4 py-3">
            <div className="flex items-start gap-2.5">
              <LocationOutlineIcon size={18} className="mt-0.5 shrink-0 text-navy" />
              <div className="flex-1 text-xs leading-[1.125rem] text-ink-body">
                {gpsReady ? (
                  <p>
                    <strong className="font-bold text-ink">GPS verification is active.</strong> Your coordinates are sent
                    only to confirm you are at the landmark and sort nearby matches.
                  </p>
                ) : geo.status === 'denied' ? (
                  <p>
                    <strong className="font-bold text-ink">Location is off.</strong> Allow location in browser settings to
                    verify you are at the site, or keep scanning without GPS.
                  </p>
                ) : (
                  <p>
                    <strong className="font-bold text-ink">Verify with GPS (optional).</strong> Your coordinates are sent to
                    our server only to confirm you are at the landmark and sort nearby spots.
                  </p>
                )}
              </div>
            </div>
            {!gpsReady && (
              <button
                type="button"
                onClick={geo.request}
                className={`touch-target flex h-12 w-full items-center justify-center rounded-xl bg-navy px-4 text-xs font-bold tracking-[0.04em] text-on-navy uppercase active:bg-navy-pressed ${sheetFocus}`}
              >
                {geo.status === 'denied' ? 'Try again' : 'Share location'}
              </button>
            )}
          </div>
        )}

        {validationError && (
          <p role="alert" className="rounded-2xl border border-danger-line bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            {validationError}
          </p>
        )}
        {scan.isError && <ErrorMessage error={scan.error} />}

        {/* Scan fallback results */}
        {result && result.status !== 'identified' && (
          <section className="flex flex-col gap-3" aria-live="polite">
            <p className="rounded-2xl border border-ivory-line bg-ivory-deep/50 p-4 text-sm text-ink-body">
              {STATUS_COPY[result.status]}
            </p>
            {result.candidates && result.candidates.length > 0 ? (
              <>
                <h2 className="font-display text-xl leading-7 font-bold text-ink">Closest landmarks</h2>
                <ul className="flex flex-col gap-3">
                  {result.candidates.map((l) => (
                    <li key={l.id}>
                      <LandmarkRow landmark={l} />
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <Link to="/" className={`touch-target inline-flex items-center justify-center text-sm font-bold text-terracotta-ink underline ${sheetFocus}`}>
                Browse landmarks instead
              </Link>
            )}
          </section>
        )}

        {/* Default AI Overview & Cebu Spots */}
        {(!result || result.status === 'identified') && (
          <section className="flex flex-col gap-2.5" aria-labelledby="scan-overview-title">
            <h2 id="scan-overview-title" className="font-display text-xl leading-7 font-bold text-ink">
              AI Overview
            </h2>
            <p className="text-sm leading-5 text-ink-body">
              Frame a Cebu landmark in the lens and tap <strong>Take photo</strong>, upload an image from your gallery, or
              pick a Cebu spot below to read its story.
            </p>
            {suggested.data && suggested.data.length > 0 && (
              <ul className="mt-1 flex flex-col gap-3">
                {suggested.data.map((l) => (
                  <li key={l.id}>
                    <LandmarkRow landmark={l} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
