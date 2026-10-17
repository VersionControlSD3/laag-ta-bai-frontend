import { Link } from 'react-router'
import { Landmark as LandmarkIcon, Star } from 'lucide-react'
import type { LandmarkSummary } from '@/api/types'
import { CATEGORY_LABELS, formatDistance } from '@/lib/format'

export function LandmarkImage({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  return src ? (
    <img src={src} alt={alt} loading="lazy" className={`object-cover ${className ?? ''}`} />
  ) : (
    <div className={`flex items-center justify-center bg-surface-strong text-primary ${className ?? ''}`} aria-hidden>
      <LandmarkIcon size={32} />
    </div>
  )
}

/** Compact card for horizontal carousels ("Nearby You"). */
export function LandmarkTile({ landmark }: { landmark: LandmarkSummary }) {
  return (
    <Link to={`/landmarks/${landmark.id}`} className="w-40 shrink-0 snap-start rounded-2xl border border-line bg-surface p-3">
      <LandmarkImage src={landmark.imageUrl} alt={landmark.name} className="mb-3 h-32 w-full rounded-xl" />
      <p className="truncate font-bold">{landmark.name}</p>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="font-medium text-coral">{formatDistance(landmark.distanceMeters) ?? landmark.district}</span>
        <span className="flex items-center gap-1">
          <Star size={12} className="fill-gold text-gold" aria-hidden /> {landmark.rating.toFixed(1)}
        </span>
      </div>
    </Link>
  )
}

/** Full-width row ("Popular Landmarks", search results). */
export function LandmarkRow({ landmark }: { landmark: LandmarkSummary }) {
  const distance = formatDistance(landmark.distanceMeters)
  return (
    <Link to={`/landmarks/${landmark.id}`} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-3">
      <LandmarkImage src={landmark.imageUrl} alt={landmark.name} className="h-20 w-20 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold leading-tight">{landmark.name}</p>
          <span className="flex shrink-0 items-center gap-1 rounded-lg bg-black/30 px-2 py-1 text-xs font-bold text-white">
            <Star size={12} className="fill-gold text-gold" aria-hidden /> {landmark.rating.toFixed(1)}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">
          {landmark.district}
          {distance && ` • ${distance}`}
        </p>
        <span className="mt-2 inline-block rounded-md border border-primary/30 bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
          {CATEGORY_LABELS[landmark.category]}
        </span>
      </div>
    </Link>
  )
}
