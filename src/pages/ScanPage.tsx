import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ApiError } from '@/api/client'
import { useScan } from '@/api/hooks'
import type { LandmarkSummary, ScanResult } from '@/api/types'
import { LandmarkImage } from '@/components/LandmarkCard'
import {
  AlertCircleOutlineIcon,
  CameraOutlineIcon,
  CameraReverseOutlineIcon,
  CloseIcon,
  CloudOfflineOutlineIcon,
  FlashOffOutlineIcon,
  FlashOutlineIcon,
  ImagesOutlineIcon,
  LocationOutlineIcon,
  RefreshIcon,
  SearchOutlineIcon,
} from '@/components/icons/ionicons'
import { useCamera } from '@/hooks/useCamera'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useOnline } from '@/hooks/useOnline'
import { ACCEPTED_IMAGE_TYPES, validateImage } from '@/lib/image'
import { env } from '@/lib/env'
import { formatDistance } from '@/lib/format'

type Phase = 'camera' | 'processing' | 'result' | 'error'

/** State passed to the landmark screen so it can show "Landmark matched · 98%". */
export type ScanMatchState = { match: { confidence: number } }

/**
 * Scan-to-Story (SRS 3.1.1.1-3.1.1.2), from Figma Final Pages "Scan-to-Story Page",
 * "… - Scanning" and "… - Landmark Details". A confident match goes straight to the landmark;
 * low-confidence, not-nearby and no-match results stay here with the photo for comparison.
 */
export default function ScanPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const geo = useGeolocation()
  const online = useOnline()
  const scan = useScan()
  const { video: cameraVideo, ...camera } = useCamera()
  const galleryInput = useRef<HTMLInputElement>(null)
  const captureInput = useRef<HTMLInputElement>(null)
  const request = useRef<AbortController | null>(null)

  const [phase, setPhase] = useState<Phase>('camera')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastPhoto, setLastPhoto] = useState<File | null>(null)

  useEffect(() => () => request.current?.abort(), [])
  // Load the landmark screen while the camera is open, so a match opens without a spinner.
  useEffect(() => void import('./LandmarkPage'), [])
  useEffect(() => () => void (photoUrl && URL.revokeObjectURL(photoUrl)), [photoUrl])

  const close = () => (location.key === 'default' ? navigate('/') : navigate(-1))

  const retake = () => {
    request.current?.abort()
    setResult(null)
    setError(null)
    setPhotoUrl(null)
    setPhase('camera')
    void camera.start()
  }

  const identify = async (file: File) => {
    // Show the photo and the processing state at once; validating a large photo takes a moment.
    const controller = new AbortController()
    request.current = controller
    setLastPhoto(file)
    setPhotoUrl(URL.createObjectURL(file))
    setError(null)
    setPhase('processing')
    camera.pause()
    const check = await validateImage(file)
    if (controller.signal.aborted) return
    if (!check.ok) {
      setError(check.reason)
      setPhase('error')
      return
    }
    try {
      const outcome = await scan.mutateAsync({
        image: file,
        lat: geo.coords?.lat,
        lng: geo.coords?.lng,
        signal: controller.signal,
      })
      if (outcome.status === 'identified' && outcome.landmark) {
        navigate(`/landmarks/${outcome.landmark.id}`, { state: { match: { confidence: outcome.confidence } } satisfies ScanMatchState })
        return
      }
      setResult(outcome)
      setPhase('result')
    } catch (failure) {
      if (controller.signal.aborted) return
      setError(failure instanceof ApiError || failure instanceof Error ? failure.message : 'Something went wrong.')
      setPhase('error')
    }
  }

  const shoot = async () => {
    setPhase('processing')
    const file = await camera.capture()
    if (file) {
      void identify(file)
    } else {
      setError('We couldn’t take the photo. Hold steady and try again.')
      setPhase('error')
    }
  }

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void identify(file)
  }

  const cancel = () => {
    request.current?.abort()
    retake()
  }

  const inputs = (
    <>
      <input ref={galleryInput} type="file" accept={ACCEPTED_IMAGE_TYPES.join(',')} className="hidden" onChange={onFile} data-testid="gallery-input" />
      <input ref={captureInput} type="file" accept={ACCEPTED_IMAGE_TYPES.join(',')} capture="environment" className="hidden" onChange={onFile} data-testid="camera-input" />
    </>
  )

  if (phase === 'result' && result) {
    return (
      <>
        <ScanResults result={result} photoUrl={photoUrl} onRetake={retake} onClose={close} />
        {inputs}
      </>
    )
  }

  if (phase === 'error') {
    return (
      <>
        <ScanError
          message={error ?? 'Something went wrong.'}
          photoUrl={photoUrl}
          offline={!online}
          onRetry={lastPhoto && photoUrl ? () => void identify(lastPhoto) : undefined}
          onRetake={retake}
          onClose={close}
        />
        {inputs}
      </>
    )
  }

  const blocked = camera.status === 'denied' || camera.status === 'unavailable' || camera.status === 'error'
  return (
    // The camera UI sits on a dark photo in both themes, so it always uses the light token values.
    <div data-theme="light" className="fixed inset-0 z-50 mx-auto max-w-md overflow-hidden bg-navy-pressed text-ivory">
      <video ref={cameraVideo} playsInline muted aria-label="Camera preview" className={`absolute inset-0 size-full object-cover ${camera.status === 'live' ? '' : 'invisible'}`} />
      {phase === 'processing' && photoUrl && <img src={photoUrl} alt="Your photo" className="absolute inset-0 size-full object-cover" />}

      {/* Header: close, title, flash. Gradient keeps it readable over any background. */}
      <header
        className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-linear-to-b from-navy/80 to-navy/0 px-4 pb-6"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
      >
        <OverlayButton label="Close camera" onClick={close}>
          <CloseIcon />
        </OverlayButton>
        <div className="min-w-0 flex-1 pt-1 text-center">
          <p className="text-[0.625rem] leading-[0.875rem] font-bold tracking-[0.1em] text-terracotta-soft uppercase">Scan to discover</p>
          <p className="text-sm font-bold">Point at a landmark</p>
          {env.mockApi && <p className="mt-1 text-xs text-ivory/80">Demo mode: results are sample data</p>}
        </div>
        {camera.torchSupported && phase === 'camera' ? (
          <OverlayButton label={camera.torchOn ? 'Turn flash off' : 'Turn flash on'} pressed={camera.torchOn} onClick={() => void camera.toggleTorch()}>
            {camera.torchOn ? <FlashOutlineIcon /> : <FlashOffOutlineIcon />}
          </OverlayButton>
        ) : (
          <span className="size-12 shrink-0" aria-hidden />
        )}
      </header>

      {blocked && phase === 'camera' ? (
        <CameraBlocked
          status={camera.status}
          onRetry={() => void camera.start()}
          onUpload={() => galleryInput.current?.click()}
          onSystemCamera={() => captureInput.current?.click()}
        />
      ) : (
        <Viewfinder>
          {phase === 'processing' && (
            <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-navy/70 px-6 text-center shadow-2xl backdrop-blur-md">
              <span className="mb-2 size-10 rounded-full border-[3px] border-ivory/25 border-t-ivory motion-safe:animate-spin" aria-hidden />
              <p className="text-base font-bold">bAI is identifying…</p>
              <p className="text-sm text-ivory/85">Matching with our Cebu database</p>
              <button
                type="button"
                onClick={cancel}
                className="mt-4 min-h-12 rounded-full border border-ivory/40 px-6 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory"
              >
                Cancel
              </button>
            </div>
          )}
        </Viewfinder>
      )}

      {/* Bottom controls: gallery, shutter, switch camera. */}
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 bg-linear-to-b from-navy/0 to-navy/90 to-40% px-6 pt-16"
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
      >
        {!online && phase === 'camera' && (
          <p role="status" className="flex items-center gap-2 rounded-full bg-camera-control px-4 py-2 text-sm">
            <CloudOfflineOutlineIcon size={18} /> You're offline. Scanning needs a connection.
          </p>
        )}
        {online && phase === 'camera' && !blocked && geo.status !== 'ready' && (
          <button type="button" onClick={geo.request} className="flex min-h-12 items-center gap-2 rounded-full border border-ivory/30 bg-camera-control px-4 text-sm">
            <LocationOutlineIcon size={18} />
            {geo.status === 'denied' ? 'Location is off: we can’t confirm you’re at the site' : 'Share location to confirm you’re at the site'}
          </button>
        )}
        <div className="flex items-center justify-center gap-[38px]">
          <OverlayButton label="Choose from gallery" onClick={() => galleryInput.current?.click()} disabled={phase !== 'camera' || !online}>
            <ImagesOutlineIcon size={22} />
          </OverlayButton>
          <button
            type="button"
            aria-label="Scan landmark"
            onClick={() => void shoot()}
            disabled={phase !== 'camera' || camera.status !== 'live' || !online}
            className="flex size-[82px] items-center justify-center rounded-full border-2 border-ivory p-[5px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ivory disabled:opacity-50"
          >
            <span className="flex size-full items-center justify-center rounded-full bg-navy active:bg-navy-pressed">
              <CameraOutlineIcon size={28} />
            </span>
          </button>
          <OverlayButton label="Switch camera" onClick={camera.switchCamera} disabled={phase !== 'camera' || camera.status !== 'live'}>
            <CameraReverseOutlineIcon size={22} />
          </OverlayButton>
        </div>
      </div>
      {inputs}
    </div>
  )
}

/** Translucent round control over the camera feed (Figma IconButton, camera tone). */
function OverlayButton({ label, onClick, children, disabled, pressed }: { label: string; onClick: () => void; children: ReactNode; disabled?: boolean; pressed?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
      className="flex size-12 shrink-0 items-center justify-center rounded-full border border-ivory/30 bg-camera-control text-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory disabled:opacity-40"
    >
      {children}
    </button>
  )
}

/** Terracotta corner brackets framing the landmark (Figma: 54px corners, 361 × 478 frame). */
function Viewfinder({ children }: { children?: ReactNode }) {
  const corner = 'absolute size-[54px] border-terracotta'
  return (
    <div
      className="absolute top-[47%] left-1/2 aspect-[361/478] -translate-x-1/2 -translate-y-1/2"
      style={{ width: 'min(361px, calc(100% - 80px), calc((100dvh - 330px) * 0.755))' }}
    >
      <span className={`${corner} top-0 left-0 rounded-tl-xl border-t-[3px] border-l-[3px]`} aria-hidden />
      <span className={`${corner} top-0 right-0 rounded-tr-xl border-t-[3px] border-r-[3px]`} aria-hidden />
      <span className={`${corner} bottom-0 left-0 rounded-bl-xl border-b-[3px] border-l-[3px]`} aria-hidden />
      <span className={`${corner} right-0 bottom-0 rounded-br-xl border-r-[3px] border-b-[3px]`} aria-hidden />
      {children}
    </div>
  )
}

function CameraBlocked({ status, onRetry, onUpload, onSystemCamera }: { status: string; onRetry: () => void; onUpload: () => void; onSystemCamera: () => void }) {
  const denied = status === 'denied'
  return (
    <div role="alert" className="absolute inset-x-6 top-1/2 flex -translate-y-1/2 flex-col items-center gap-3 rounded-3xl bg-navy/80 p-6 text-center backdrop-blur-md">
      <span className="flex size-14 items-center justify-center rounded-full bg-camera-control">
        <CameraOutlineIcon size={28} />
      </span>
      <h2 className="text-lg font-bold">{denied ? 'Camera access is off' : 'We can’t open the camera'}</h2>
      <p className="text-sm text-ivory/85">
        {denied
          ? 'Allow camera access for Laag ta bAI in your browser or phone settings, then try again. You can also upload a photo.'
          : 'Your device or browser didn’t give us a camera. Take a photo with your phone’s camera or upload one instead.'}
      </p>
      <div className="mt-2 flex w-full flex-col gap-2">
        {denied ? (
          <button type="button" onClick={onRetry} className="min-h-12 rounded-xl bg-ivory font-bold text-navy">
            Try again
          </button>
        ) : (
          <button type="button" onClick={onSystemCamera} className="min-h-12 rounded-xl bg-ivory font-bold text-navy">
            Take a photo
          </button>
        )}
        <button type="button" onClick={onUpload} className="min-h-12 rounded-xl border border-ivory/40 font-bold">
          Upload a photo
        </button>
      </div>
    </div>
  )
}

const RESULT_COPY: Record<Exclude<ScanResult['status'], 'identified'>, { eyebrow: string; title: string; body: string }> = {
  low_confidence: {
    eyebrow: 'Not quite sure',
    title: 'Is this the landmark?',
    body: 'bAI has a guess but isn’t confident. Check it against your photo, or retake it with the whole structure in frame and good light.',
  },
  not_nearby: {
    eyebrow: 'Looks familiar',
    title: 'That landmark isn’t near you',
    body: 'Your photo looks like a landmark that is more than 500 m from where you are. You can still read its story.',
  },
  unrecognized: {
    eyebrow: 'No match',
    title: 'We couldn’t recognize this',
    body: 'Try again straight on with the whole landmark in frame, or search for it by name.',
  },
}

/** Low-confidence, not-nearby and no-match results, with the captured photo for comparison. */
function ScanResults({ result, photoUrl, onRetake, onClose }: { result: ScanResult; photoUrl: string | null; onRetake: () => void; onClose: () => void }) {
  const status = result.status === 'identified' ? 'low_confidence' : result.status
  const copy = RESULT_COPY[status]
  const best = result.landmark
  const others = result.candidates.filter((c) => c.id !== best?.id)
  return (
    <div className="mx-auto min-h-dvh max-w-md bg-linear-to-b from-ivory to-ivory-deep text-ink">
      <ResultHeader onClose={onClose} />
      <main className="flex flex-col gap-6 px-6 pt-4 pb-10" aria-live="polite">
        <section className="flex flex-col gap-2">
          <p className="text-xs font-bold tracking-[0.1em] text-terracotta-ink uppercase">{copy.eyebrow}</p>
          <h1 className="text-2xl font-bold">{copy.title}</h1>
          <p className="text-ink-body">{copy.body}</p>
        </section>

        <div className={`grid gap-3 ${best ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {photoUrl && <Figure src={photoUrl} label="Your photo" />}
          {best && <Figure src={best.imageUrl} label={best.name} />}
        </div>

        {best && (
          <MatchCard landmark={best} confidence={result.confidence} best />
        )}

        {others.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">{best ? 'Or is it one of these nearby?' : 'Landmarks near you'}</h2>
            <ul className="flex flex-col gap-3">
              {others.map((landmark) => (
                <li key={landmark.id}>
                  <MatchCard landmark={landmark} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-col gap-3">
          <button type="button" onClick={onRetake} className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-navy font-bold text-on-navy shadow-navy active:bg-navy-pressed">
            <CameraOutlineIcon size={20} /> Retake photo
          </button>
          <Link to="/" className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line-strong font-bold text-navy">
            <SearchOutlineIcon size={20} /> Search landmarks by name
          </Link>
        </div>
      </main>
    </div>
  )
}

function ResultHeader({ onClose }: { onClose: () => void }) {
  return (
    <header className="flex items-center justify-between px-4 pb-2" style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
      <button type="button" onClick={onClose} aria-label="Close" className="flex size-12 items-center justify-center rounded-full text-navy focus-visible:outline-2 focus-visible:outline-navy">
        <CloseIcon />
      </button>
      <p className="text-sm font-bold text-ink-muted">Scan result</p>
      <span className="size-12" aria-hidden />
    </header>
  )
}

function Figure({ src, label }: { src: string | null; label: string }) {
  return (
    <figure className="flex flex-col gap-1">
      <LandmarkImage src={src} alt={label} className="aspect-[3/4] w-full rounded-2xl" />
      <figcaption className="truncate text-xs font-medium text-ink-muted">{label}</figcaption>
    </figure>
  )
}

/** One possible match: name, image, and, when the API sends one, a confidence score as text and a bar. */
function MatchCard({ landmark, confidence, best }: { landmark: LandmarkSummary; confidence?: number; best?: boolean }) {
  const percent = confidence === undefined ? null : Math.round(confidence * 100)
  const distance = formatDistance(landmark.distanceMeters)
  const label = [landmark.name, percent !== null ? `${percent} percent match` : null, best ? 'best match' : null].filter(Boolean).join(', ')
  return (
    <Link
      to={`/landmarks/${landmark.id}`}
      aria-label={label}
      className={`flex items-center gap-4 rounded-2xl border bg-ivory-surface p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${best ? 'border-navy' : 'border-ivory-line'}`}
    >
      <LandmarkImage src={landmark.imageUrl} alt="" className="size-20 shrink-0 rounded-xl" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {best && <span className="w-fit rounded-full bg-terracotta-soft px-2 py-0.5 text-[0.625rem] leading-[0.875rem] font-bold tracking-wide text-terracotta-ink uppercase">Best match</span>}
        <p className="truncate text-lg font-bold text-ink">{landmark.name}</p>
        {percent !== null ? (
          <>
            <p className="text-sm text-ink-body">
              <span className="font-bold">{percent}% match</span> · {percent >= 80 ? 'High' : percent >= 50 ? 'Medium' : 'Low'} confidence
            </p>
            <div role="progressbar" aria-label="Match confidence" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-1.5 overflow-hidden rounded-full bg-sage-soft">
              <div className="h-full rounded-full bg-navy" style={{ width: `${percent}%` }} />
            </div>
          </>
        ) : (
          <p className="truncate text-sm text-ink-muted">{distance ? `${distance} away` : landmark.district}</p>
        )}
      </div>
    </Link>
  )
}

function ScanError({ message, photoUrl, offline, onRetry, onRetake, onClose }: { message: string; photoUrl: string | null; offline: boolean; onRetry?: () => void; onRetake: () => void; onClose: () => void }) {
  return (
    <div className="mx-auto min-h-dvh max-w-md bg-linear-to-b from-ivory to-ivory-deep text-ink">
      <ResultHeader onClose={onClose} />
      <main role="alert" className="flex flex-col items-center gap-4 px-6 pt-6 pb-10 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-danger-soft text-danger">
          {offline ? <CloudOfflineOutlineIcon size={32} /> : <AlertCircleOutlineIcon size={32} />}
        </span>
        <h1 className="text-2xl font-bold">{offline ? 'You’re offline' : 'We couldn’t scan that'}</h1>
        <p className="text-ink-body">{offline ? 'Scanning needs a connection. Your saved landmarks still work offline.' : message}</p>
        {photoUrl && <img src={photoUrl} alt="Your photo" className="aspect-[3/4] w-40 rounded-2xl object-cover" />}
        <div className="mt-2 flex w-full flex-col gap-3">
          {onRetry && !offline && (
            <button type="button" onClick={onRetry} className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-navy font-bold text-on-navy shadow-navy">
              <RefreshIcon size={20} /> Try again
            </button>
          )}
          <button type="button" onClick={onRetake} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line-strong font-bold text-navy">
            <CameraOutlineIcon size={20} /> Retake photo
          </button>
          {offline && (
            <Link to="/archives" className="flex min-h-12 items-center justify-center font-bold text-terracotta-ink underline">
              Open saved landmarks
            </Link>
          )}
        </div>
      </main>
    </div>
  )
}
