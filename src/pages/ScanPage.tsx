import { useRef, useState, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Camera, ImageUp, Loader2, MapPin, ScanLine } from 'lucide-react'
import { useScan } from '@/api/hooks'
import type { ScanMatchState } from '@/pages/LandmarkPage'
import { LandmarkRow } from '@/components/LandmarkCard'
import { PageHeader } from '@/components/PageHeader'
import { ErrorMessage } from '@/components/StateMessage'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useT } from '@/i18n'
import { ACCEPTED_IMAGE_TYPES, validateImage } from '@/lib/image'

/** Scan-to-Story (SRS 3.1.1.1-3.1.1.2). Uses the device camera through a capture input. */
export default function ScanPage() {
  const navigate = useNavigate()
  const t = useT()
  const s = t.scan
  const geo = useGeolocation()
  const scan = useScan()
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setValidationError(null)
    scan.reset()
    const check = await validateImage(file)
    if (!check.ok) {
      setValidationError(t.common.image[check.reason])
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
          if (result.status === 'identified' && result.landmark)
            navigate(`/landmarks/${result.landmark.id}`, { state: { confidence: result.confidence } satisfies ScanMatchState })
        },
      },
    )
  }

  const result = scan.data
  return (
    <div>
      <PageHeader title={s.title} subtitle={s.subtitle} />
      <div className="px-5">
        <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-primary/60 bg-surface">
          {preview ? (
            <img src={preview} alt={s.yourPhoto} className="h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 p-8 text-center text-muted">
              <ScanLine size={56} className="text-primary" aria-hidden />
              <p>{s.frame}</p>
            </div>
          )}
          {scan.isPending && (
            <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white">
              <Loader2 className="animate-spin" size={40} aria-hidden />
              <p className="font-semibold">{s.identifying}</p>
            </div>
          )}
        </div>

        {geo.status !== 'ready' && (
          <button type="button" onClick={geo.request} className="touch-target mt-3 flex w-full items-center gap-2 rounded-2xl border border-line bg-surface px-4 text-left text-sm">
            <MapPin size={18} className="shrink-0 text-primary" aria-hidden />
            {geo.status === 'denied'
              ? s.locationOff
              : s.shareLocation}
          </button>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => cameraInput.current?.click()} className="touch-target flex items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-on-primary">
            <Camera aria-hidden /> {s.takePhoto}
          </button>
          <button type="button" onClick={() => galleryInput.current?.click()} className="touch-target flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface font-bold">
            <ImageUp aria-hidden /> {s.upload}
          </button>
        </div>
        <input ref={cameraInput} type="file" accept={ACCEPTED_IMAGE_TYPES.join(',')} capture="environment" className="hidden" onChange={onFile} data-testid="camera-input" />
        <input ref={galleryInput} type="file" accept={ACCEPTED_IMAGE_TYPES.join(',')} className="hidden" onChange={onFile} data-testid="gallery-input" />

        {validationError && <p role="alert" className="mt-4 rounded-2xl bg-crimson/15 p-4 text-sm font-semibold">{validationError}</p>}
        {scan.isError && <ErrorMessage error={scan.error} />}

        {result && result.status !== 'identified' && (
          <section className="mt-5 space-y-3" aria-live="polite">
            <p className="rounded-2xl border border-line bg-surface p-4 text-sm">{s.status[result.status]}</p>
            {result.candidates.length > 0 ? (
              <>
                <h2 className="font-bold">{s.closest}</h2>
                {result.candidates.map((l) => <LandmarkRow key={l.id} landmark={l} />)}
              </>
            ) : (
              <Link to="/" className="block text-center font-bold text-primary underline">{s.browse}</Link>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
