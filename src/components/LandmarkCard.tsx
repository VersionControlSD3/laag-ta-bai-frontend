import { Link } from 'react-router'
import type { LandmarkSummary } from '@/api/types'
import { ArrowForwardIcon, LocationOutlineIcon, MapOutlineIcon, StarIcon } from '@/components/icons/ionicons'
import { CATEGORY_LABELS, formatDistance, formatFee } from '@/lib/format'

export function LandmarkImage({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  return src ? (
    <img src={src} alt={alt} loading="lazy" className={`object-cover ${className ?? ''}`} />
  ) : (
    <div className={`flex items-center justify-center bg-sage-soft text-sage-deep ${className ?? ''}`} aria-hidden>
      <MapOutlineIcon size={32} />
    </div>
  )
}

export function Rating({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-1 text-xs leading-4 font-bold text-ink">
      <StarIcon size={10} className="text-terracotta" />
      <span className="sr-only">Rated</span>
      {value.toFixed(1)}
    </span>
  )
}

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy'

/** Editorial "Today" spotlight card on Explore (Figma 638:10770). */
export function FeaturedLandmarkCard({ landmark }: { landmark: LandmarkSummary }) {
  return (
    <Link
      to={`/landmarks/${landmark.id}`}
      data-palette="light"
      className={`relative flex h-60 w-full flex-col items-start justify-between overflow-hidden rounded-3xl border border-ivory-line px-5 py-4 shadow-card ${focus}`}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <LandmarkImage src={landmark.imageUrl} alt="" className="size-full" />
        <div className="absolute inset-0 bg-linear-to-b from-ink/10 via-navy/30 to-navy/92" />
      </div>
      <span className="relative rounded-full bg-terracotta-ink px-3 py-1 text-xs leading-4 font-semibold text-on-navy">
        {CATEGORY_LABELS[landmark.category] ?? landmark.category}
      </span>
      <div className="relative flex w-full flex-col gap-1">
        <h3 className="font-display text-2xl leading-7 font-bold text-on-navy">{landmark.name}</h3>
        <p className="flex items-center gap-1.5 font-mono text-xs leading-4 font-bold text-on-navy/95">
          <StarIcon size={12} className="shrink-0 text-gold" />
          <span className="sr-only">Rated</span>
          <span>
            {landmark.rating.toFixed(1)} • {landmark.district} • {formatFee(landmark.admissionFee)}
          </span>
        </p>
      </div>
    </Link>
  )
}

/**
 * Figma "LandmarkTile" (638:10783): 208 × 256 px editorial card for the Nearby You horizontal rail.
 */
export function LandmarkTile({ landmark }: { landmark: LandmarkSummary }) {
  return (
    <Link
      to={`/landmarks/${landmark.id}`}
      data-palette="light"
      className={`relative flex h-64 w-52 shrink-0 snap-start flex-col justify-between overflow-hidden rounded-3xl border border-ivory-line p-3.5 shadow-card ${focus}`}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <LandmarkImage src={landmark.imageUrl} alt="" className="size-full" />
        <div className="absolute inset-0 bg-linear-to-b from-terracotta/20 via-navy/25 to-navy/92" />
      </div>
      <div className="relative flex w-full items-center justify-between gap-2">
        <span className="rounded-full bg-ivory-surface/95 px-2.5 py-1 font-mono text-[0.6875rem] leading-[0.875rem] font-bold text-navy">
          {formatDistance(landmark.distanceMeters) ?? landmark.district}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-ivory-surface/95 px-2.5 py-1 font-mono text-[0.6875rem] leading-[0.875rem] font-bold text-terracotta-ink">
          <StarIcon size={11} className="shrink-0 text-terracotta" />
          <span className="sr-only">Rated</span>
          {landmark.rating.toFixed(1)}
        </span>
      </div>
      <div className="relative flex w-full flex-col gap-0.5">
        <p className="line-clamp-2 font-display text-xl leading-6 font-bold text-on-navy">{landmark.name}</p>
        <p className="truncate text-xs leading-4 font-medium text-on-navy/90">
          {CATEGORY_LABELS[landmark.category] ?? landmark.category} · {formatFee(landmark.admissionFee)}
        </p>
      </div>
    </Link>
  )
}

/** Figma "LandmarkRow" (638:10789): editorial card for Popular Landmarks and search results. */
export function LandmarkRow({ landmark }: { landmark: LandmarkSummary }) {
  const distance = formatDistance(landmark.distanceMeters)
  return (
    <Link
      to={`/landmarks/${landmark.id}`}
      className={`relative flex flex-col overflow-hidden rounded-3xl border border-ivory-line bg-ivory-surface shadow-card ${focus}`}
    >
      <div className="relative flex h-48 w-full flex-col justify-between p-3" data-palette="light">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <LandmarkImage src={landmark.imageUrl} alt="" className="size-full" />
          <div className="absolute inset-0 bg-linear-to-b from-navy/30 via-transparent to-navy/35" />
        </div>
        <div className="relative flex w-full items-center justify-between gap-2">
          <span className="rounded-full bg-sage-soft/95 px-3 py-1 font-mono text-[0.6875rem] leading-[0.875rem] font-bold text-sage-deep">
            {formatFee(landmark.admissionFee)}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-ivory-surface/95 px-2.5 py-1 font-mono text-[0.6875rem] leading-[0.875rem] font-bold text-terracotta-ink">
            <StarIcon size={11} className="shrink-0 text-terracotta" />
            <span className="sr-only">Rated</span>
            {landmark.rating.toFixed(1)}
          </span>
        </div>
        <div className="relative flex w-full justify-end">
          <span className="rounded-lg bg-terracotta-ink px-2.5 py-1 text-[0.6875rem] leading-[0.875rem] font-bold text-on-navy">
            {CATEGORY_LABELS[landmark.category] ?? landmark.category}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 p-4">
        <p className="font-display text-2xl leading-7 font-bold wrap-break-word text-ink">{landmark.name}</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1.5 text-xs leading-4 text-ink-muted">
            <LocationOutlineIcon size={14} className="shrink-0 text-terracotta" />
            <span className="truncate">
              {landmark.district}
              {distance && ` · ${distance}`}
            </span>
          </p>
          <span className="flex shrink-0 items-center gap-1 text-xs leading-4 font-bold text-terracotta-ink">
            Read story
            <ArrowForwardIcon size={12} />
          </span>
        </div>
        {landmark.visitingHours && (
          <p className="font-mono text-[0.6875rem] leading-4 font-medium text-ink-muted">Hours · {landmark.visitingHours}</p>
        )}
      </div>
    </Link>
  )
}
