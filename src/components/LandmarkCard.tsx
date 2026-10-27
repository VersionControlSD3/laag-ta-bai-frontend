import { Link } from 'react-router'
import type { LandmarkSummary } from '@/api/types'
import { MapOutlineIcon, StarIcon } from '@/components/icons/ionicons'
import { CATEGORY_LABELS, formatDistance } from '@/lib/format'

export function LandmarkImage({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  return src ? (
    <img src={src} alt={alt} loading="lazy" className={`object-cover ${className ?? ''}`} />
  ) : (
    <div className={`flex items-center justify-center bg-sage-soft text-sage-deep ${className ?? ''}`} aria-hidden>
      <MapOutlineIcon size={32} />
    </div>
  )
}

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy'

// The name is visible text inside the link, so photos are decorative here (alt="") to avoid reading it twice.
function Media({ landmark, className }: { landmark: LandmarkSummary; className: string }) {
  return (
    <div className={`shrink-0 rounded-xl bg-sage-soft p-1 ${className}`}>
      <LandmarkImage src={landmark.imageUrl} alt="" className="size-full rounded-xl" />
    </div>
  )
}

function Rating({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-1 text-xs leading-4 font-bold text-ink">
      <StarIcon size={10} className="text-terracotta" />
      <span className="sr-only">Rated</span>
      {value.toFixed(1)}
    </span>
  )
}

/** Figma "Landmark Card": 160 px tile for horizontal rails (Nearby You). */
export function LandmarkTile({ landmark }: { landmark: LandmarkSummary }) {
  return (
    <Link
      to={`/landmarks/${landmark.id}`}
      className={`flex w-40 shrink-0 snap-start flex-col rounded-2xl border border-ivory-line bg-ivory-surface p-3 shadow-md ${focus}`}
    >
      <Media landmark={landmark} className="h-32 w-full" />
      <p className="mt-3 truncate text-base leading-6 font-bold text-ink">{landmark.name}</p>
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs leading-4 font-semibold text-terracotta-ink">
          {formatDistance(landmark.distanceMeters) ?? landmark.district}
        </span>
        <Rating value={landmark.rating} />
      </div>
    </Link>
  )
}

/** Figma "Landmark Row": full-width row with an 80 px thumbnail (Popular Landmarks, search results). */
export function LandmarkRow({ landmark }: { landmark: LandmarkSummary }) {
  const distance = formatDistance(landmark.distanceMeters)
  return (
    <Link
      to={`/landmarks/${landmark.id}`}
      className={`flex items-center gap-4 rounded-2xl border border-ivory-line bg-ivory-surface p-3 ${focus}`}
    >
      <Media landmark={landmark} className="size-20" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 text-lg leading-7 font-bold text-ink">{landmark.name}</p>
          <span className="shrink-0 rounded-lg border border-ivory-line bg-ivory-surface px-2 py-1">
            <Rating value={landmark.rating} />
          </span>
        </div>
        <p className="text-xs leading-4 text-ink-muted">
          {landmark.district}
          {distance && ` · ${distance}`}
        </p>
        <span className="mt-1 self-start rounded-md bg-terracotta-soft px-2 py-1 text-[0.625rem] leading-[0.875rem] font-bold tracking-wide text-terracotta-ink uppercase">
          {CATEGORY_LABELS[landmark.category]}
        </span>
      </div>
    </Link>
  )
}
