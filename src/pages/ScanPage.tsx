import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useLandmarks, useScan } from '@/api/hooks'
import type { ScanResult } from '@/api/types'
import {
  ArrowBackIcon,
  CameraOutlineIcon,
  CameraReverseOutlineIcon,
  CheckmarkIcon,
  ImageOutlineIcon,
  LocationOutlineIcon,
  ScanOutlineIcon,
} from '@/components/icons/ionicons'
import { LandmarkRow } from '@/components/LandmarkCard'
import { ErrorMessage } from '@/components/StateMessage'
import { useGeolocation } from '@/hooks/useGeolocation'
import { ACCEPTED_IMAGE_TYPES, MIN_LONG_SIDE, MIN_SHORT_SIDE, validateImage } from '@/lib/image'
import { readJson, writeJson } from '@/lib/storage'
import type { ScanMatchState } from '@/pages/LandmarkPage'

type CameraState = 'prompt' | 'starting' | 'ready' | 'unavailable'
type FacingMode = 'environment' | 'user'

export const CAMERA_RATIONALE_KEY = 'camera-rationale-accepted'

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-navy'
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

function isConstraintError(err: unknown): boolean {
  const name = typeof err === 'object' && err !== null && 'name' in err ? String((err as { name: unknown }).name) : ''
  const message =
    typeof err === 'object' && err !== null && 'message' in err ? String((err as { message: unknown }).message) : ''
  return (
    name === 'OverconstrainedError' ||
    name === 'NotFoundError' ||
    message.includes('OverconstrainedError') ||
    message.includes('NotFoundError')
  )
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

  const [cameraAccepted, setCameraAccepted] = useState(() => readJson(CAMERA_RATIONALE_KEY, false))
  const [cameraState, setCameraState] = useState<CameraState>(() =>
    !hasLiveCameraSupport() ? 'unavailable' : readJson(CAMERA_RATIONALE_KEY, false) ? 'starting' : 'prompt',
  )
  const [facingMode, setFacingMode] = useState<FacingMode>('environment')
  const [preview, setPreview] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showGpsInfo, setShowGpsInfo] = useState(false)

  // If the browser already has camera permission granted, skip the in-app rationale prompt.
  useEffect(() => {
    if (cameraAccepted || !hasLiveCameraSupport() || !navigator.permissions?.query) return
    let active = true
    navigator.permissions
      .query({ name: 'camera' as PermissionName })
      .then((status) => {
        if (active && status.state === 'granted') {
          writeJson(CAMERA_RATIONALE_KEY, true)
          setCameraAccepted(true)
          setCameraState((prev) => (prev === 'prompt' ? 'starting' : prev))
        }
      })
      .catch(() => {
        // Permissions API may not support 'camera' in some browsers; wait for the Start camera tap.
      })
    return () => {
      active = false
    }
  }, [cameraAccepted])

  const startCamera = () => {
    if (!hasLiveCameraSupport()) {
      setCameraState('unavailable')
      return
    }
    writeJson(CAMERA_RATIONALE_KEY, true)
    setCameraAccepted(true)
    setCameraState('starting')
  }

  // Manage live camera lifecycle: start only after rationale is accepted and no preview is shown.
  useEffect(() => {
    const video = videoRef.current
    if (preview || !cameraAccepted) {
      stopStream(streamRef.current, video)
      streamRef.current = null
      return
    }

    const mediaDevices = navigator.mediaDevices
    if (!mediaDevices?.getUserMedia) return

    let active = true
    let cleanupTrackListener: (() => void) | undefined

    const openCamera = async () => {
      let stream: MediaStream
      try {
        stream = await mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })
      } catch (err) {
        if (!isConstraintError(err)) {
          if (active) setCameraState('unavailable')
          return
        }
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
      const primaryTrack = stream.getVideoTracks?.()[0] ?? stream.getTracks()[0]
      const onEnded = () => {
        if (active) setCameraState('unavailable')
      }
      primaryTrack?.addEventListener?.('ended', onEnded)
      cleanupTrackListener = () => primaryTrack?.removeEventListener?.('ended', onEnded)

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
      cleanupTrackListener?.()
      stopStream(streamRef.current, video)
      streamRef.current = null
    }
  }, [cameraAccepted, preview, facingMode])

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
    setCameraState(!hasLiveCameraSupport() ? 'unavailable' : cameraAccepted ? 'starting' : 'prompt')
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
      const short = Math.min(width, height)
      const long = Math.max(width, height)
      if (video && short >= MIN_SHORT_SIDE && long >= MIN_LONG_SIDE) {
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
        className="relative -mb-5 flex flex-col gap-3 bg-linear-to-b from-navy-pressed via-navy to-navy-pressed px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-9 text-on-navy"
      >
        {/* Top bar: Back, Lens title, GPS toggle */}
        <header className="flex items-center justify-between gap-2">
          <Link
            to="/"
            aria-label="Back to Explore"
            className={`touch-target flex size-12 shrink-0 items-center justify-center rounded-full text-on-navy transition-colors hover:bg-on-navy/10 ${focus}`}
          >
            <ArrowBackIcon size={20} />
          </Link>
          <h1 className="font-display text-lg leading-[1.375rem] font-bold tracking-tight text-terracotta-light">
            Laag ta bAI Lens
          </h1>
          <button
            type="button"
            onClick={() => setShowGpsInfo((v) => !v)}
            aria-label={gpsReady ? 'GPS location active' : 'GPS location options'}
            aria-expanded={showGpsInfo}
            className={`touch-target flex h-12 shrink-0 items-center justify-center rounded-full px-1 ${focus}`}
          >
            <span
              className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[0.6875rem] leading-3.5 font-bold transition-colors ${
                gpsReady ? 'bg-sage-soft text-sage-deep' : 'border border-on-navy/25 bg-on-navy/15 text-on-navy'
              }`}
            >
              {gpsReady ? <CheckmarkIcon size={13} className="shrink-0" /> : <LocationOutlineIcon size={14} className="shrink-0" />}
              {gpsReady ? 'GPS on' : 'GPS off'}
            </span>
          </button>
        </header>

        {/* Viewfinder Frame */}
        <div className="relative h-[260px] w-full overflow-hidden rounded-3xl border border-on-navy/20 bg-ink sm:h-[300px]">
          {preview ? (
            <img src={preview} alt="Your photo" className="size-full object-cover" />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              aria-label="Live camera viewfinder"
              className={`size-full object-cover transition-opacity ${
                facingMode === 'user' ? '-scale-x-100' : ''
              } ${cameraState === 'ready' ? 'opacity-100' : 'opacity-0'}`}
            />
          )}

          {/* Corner framing brackets */}
          {(cameraState === 'ready' || preview) && (
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-x-7 top-14 bottom-5 flex items-center justify-center ${
                scan.isPending ? 'motion-safe:animate-pulse' : ''
              }`}
            >
              <span className="absolute top-0 left-0 size-7 rounded-tl-xl border-t-[3px] border-l-[3px] border-on-navy/90" />
              <span className="absolute top-0 right-0 size-7 rounded-tr-xl border-t-[3px] border-r-[3px] border-on-navy/90" />
              <span className="absolute bottom-0 left-0 size-7 rounded-bl-xl border-b-[3px] border-l-[3px] border-on-navy/90" />
              <span className="absolute right-0 bottom-0 size-7 rounded-br-xl border-r-[3px] border-b-[3px] border-on-navy/90" />
              {!scan.isPending && <ScanOutlineIcon size={40} className="text-on-navy/75" />}
            </div>
          )}

          {/* Top-left & Top-right live overlays */}
          {!preview && cameraState === 'ready' && (
            <>
              <span className="pointer-events-none absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-navy/90 px-3 py-1.5 text-[0.6875rem] leading-3.5 font-semibold text-on-navy backdrop-blur-xs">
                <span aria-hidden className="size-2 shrink-0 rounded-full bg-sage motion-safe:animate-pulse" />
                Live Camera
              </span>
              <button
                type="button"
                onClick={switchCamera}
                aria-label="Switch camera"
                className={`touch-target absolute top-2 right-2 flex size-12 items-center justify-center rounded-full bg-navy/85 text-on-navy shadow-sm backdrop-blur-xs transition-transform active:scale-95 ${focus}`}
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
              className={`touch-target absolute top-2 left-2 flex h-12 items-center gap-1.5 rounded-full bg-navy/90 px-3.5 text-xs font-bold text-on-navy shadow-sm backdrop-blur-xs transition-transform active:scale-95 ${focus}`}
            >
              <CameraOutlineIcon size={16} />
              Live camera
            </button>
          )}

          {/* Camera rationale prompt before requesting getUserMedia */}
          {!preview && cameraState === 'prompt' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/90 px-6 text-center text-on-navy">
              <CameraOutlineIcon size={36} className="text-terracotta-light" />
              <p className="max-w-[260px] text-sm leading-5 font-medium text-on-navy/90">
                Allow camera access to frame Cebu landmarks and match them with their stories.
              </p>
              <button
                type="button"
                onClick={startCamera}
                className={`touch-target flex h-12 items-center justify-center gap-2 rounded-full bg-terracotta-ink px-5 text-sm font-bold text-on-navy shadow-sm transition-opacity active:opacity-80 ${focus}`}
              >
                <CameraOutlineIcon size={18} />
                Start camera
              </button>
            </div>
          )}

          {/* Camera starting overlay */}
          {!preview && cameraState === 'starting' && (
            <div
              role="status"
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/90 px-6 text-center text-on-navy"
            >
              <span
                aria-hidden
                className="size-8 rounded-full border-2 border-on-navy/30 border-t-on-navy motion-safe:animate-spin"
              />
              <p className="text-sm font-semibold">Starting built-in camera…</p>
            </div>
          )}

          {/* Camera unavailable / denied fallback overlay */}
          {!preview && cameraState === 'unavailable' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-ink/90 px-6 text-center text-on-navy">
              <ScanOutlineIcon size={40} className="text-terracotta-light" />
              <p className="max-w-[260px] text-sm leading-5 font-medium text-on-navy/90">
                Built-in camera unavailable — upload a photo or pick a Cebu spot below.
              </p>
            </div>
          )}

          {/* Identifying landmark overlay */}
          {scan.isPending && (
            <div
              role="status"
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/70 px-6 text-center text-on-navy backdrop-blur-[2px]"
            >
              <span
                aria-hidden
                className="size-9 rounded-full border-2 border-on-navy/30 border-t-terracotta-light motion-safe:animate-spin"
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
            className={`touch-target flex h-12 items-center justify-center gap-2 rounded-full bg-terracotta-ink px-4 text-sm font-bold text-on-navy shadow-sm transition-opacity active:opacity-80 disabled:opacity-60 ${focus}`}
          >
            <CameraOutlineIcon size={18} />
            Take photo
          </button>
          <button
            type="button"
            onClick={() => galleryInput.current?.click()}
            disabled={scan.isPending}
            className={`touch-target flex h-12 items-center justify-center gap-2 rounded-full border border-on-navy/30 bg-on-navy/15 px-4 text-sm font-bold text-on-navy transition-colors active:bg-on-navy/25 disabled:opacity-60 ${focus}`}
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
      <div className="relative z-10 flex flex-1 flex-col gap-4 rounded-t-3xl bg-ivory-surface px-5 pt-3.5">
        <div aria-hidden className="mx-auto h-1 w-9 rounded-full bg-ivory-line" />

        {/* Opt-in GPS rationale card */}
        {(geo.status !== 'ready' || showGpsInfo) && (
          <div className="flex flex-col gap-2 rounded-2xl border border-ivory-line bg-ivory-deep/60 px-4 py-3">
            <div className="flex items-start gap-2.5">
              <LocationOutlineIcon size={18} className="mt-0.5 shrink-0 text-navy" />
              <div className="flex-1 text-xs leading-[1.125rem] text-ink-body">
                {gpsReady ? (
                  <p>
                    <strong className="font-bold text-ink">GPS verification is active.</strong> Your coordinates are sent to
                    our server only to confirm you are at the landmark and sort nearby spots.
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
