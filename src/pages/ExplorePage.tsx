import { useDeferredValue, useEffect, useState, type ReactNode } from 'react'
import { useLandmarks } from '@/api/hooks'
import type { LandmarkCategory } from '@/api/types'
import { LocateOutlineIcon, OptionsOutlineIcon, SearchIcon } from '@/components/icons/ionicons'
import { LandmarkRow, LandmarkTile } from '@/components/LandmarkCard'
import { useGeolocation, type GeoState } from '@/hooks/useGeolocation'
import { CATEGORY_LABELS } from '@/lib/format'

const CATEGORIES = Object.keys(CATEGORY_LABELS) as LandmarkCategory[]
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy'
const PRIVACY = 'Your coordinates are sent to our server only to sort nearby landmarks and verify scans.'

export default function ExplorePage() {
  const geo = useGeolocation()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<LandmarkCategory | undefined>()
  const [freeOnly, setFreeOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const q = useDeferredValue(search)

  const { rationaleAccepted, status, request } = geo
  useEffect(() => {
    if (rationaleAccepted && status === 'idle') request()
  }, [rationaleAccepted, status, request])

  const coords = geo.coords ? { lat: geo.coords.lat, lng: geo.coords.lng } : {}
  const nearby = useLandmarks({ ...coords, radiusKm: 5, limit: 10 })
  const results = useLandmarks({ q: q || undefined, category, free: freeOnly || undefined, ...coords })
  const filtering = Boolean(q || category || freeOnly)

  const chip = (pressed: boolean) =>
    `min-h-12 rounded-full border px-4 text-sm font-bold ${focus} ${pressed ? 'border-navy bg-navy text-on-navy' : 'border-ivory-line bg-ivory-surface text-ink'}`

  return (
    // Pulls the ivory under AppShell's nav padding so the scaffold background never shows below the list.
    <div className="-mb-[calc(96px+env(safe-area-inset-bottom))] flex min-h-dvh flex-col gap-6 bg-ivory pt-[max(3rem,env(safe-area-inset-top))] pb-[calc(96px+env(safe-area-inset-bottom))]">
      <header className="flex flex-col items-center gap-1 px-6 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-ink">Explore</h1>
        <p className="text-base text-ink-muted">Discover the heart of Cebu</p>
      </header>

      <div className="px-6">
        <label className="flex items-center gap-3 rounded-2xl border border-line-strong bg-ivory-surface pl-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-navy">
          <SearchIcon size={20} className="shrink-0 text-terracotta" />
          <span className="sr-only">Search landmarks</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search landmarks, museums..."
            className="h-12 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-muted"
          />
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            aria-label="Filters"
            className={`touch-target flex shrink-0 items-center justify-center rounded-2xl text-terracotta ${focus}`}
          >
            <OptionsOutlineIcon size={20} />
          </button>
        </label>

        {showFilters && (
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
            {CATEGORIES.map((c) => (
              <button key={c} type="button" onClick={() => setCategory(category === c ? undefined : c)} aria-pressed={category === c} className={chip(category === c)}>
                {CATEGORY_LABELS[c]}
              </button>
            ))}
            <button type="button" onClick={() => setFreeOnly((v) => !v)} aria-pressed={freeOnly} className={chip(freeOnly)}>
              Free entry
            </button>
          </div>
        )}
      </div>

      {filtering ? (
        <section className="flex flex-col gap-3 px-6" aria-label="Search results">
          {results.isPending ? (
            <RowSkeletons label="Searching landmarks" />
          ) : results.isError ? (
            <ErrorNotice onRetry={() => results.refetch()} />
          ) : results.data.length === 0 ? (
            <Notice title="No matches">Try another name, or clear the filters.</Notice>
          ) : (
            results.data.map((l) => <LandmarkRow key={l.id} landmark={l} />)
          )}
        </section>
      ) : (
        <>
          <MapPreview geo={geo} />

          <section className="flex flex-col gap-4" aria-labelledby="nearby-title">
            <div className="px-6">
              <h2 id="nearby-title" className="text-2xl font-bold text-ink">Nearby You</h2>
              <p className="text-sm text-ink-muted">Within a 5 km radius</p>
            </div>
            <div className="px-6 empty:hidden">
              {geo.status === 'idle' && (
                <Notice
                  title="See what's near you"
                  action={
                    <button type="button" onClick={geo.request} className={`h-12 w-full rounded-xl bg-navy px-6 text-base font-bold tracking-[0.05em] text-on-navy uppercase shadow-navy active:bg-navy-pressed ${focus}`}>
                      Share location
                    </button>
                  }
                >
                  Share your location to sort landmarks by distance. {PRIVACY}
                </Notice>
              )}
              {(geo.status === 'denied' || geo.status === 'unavailable') && (
                <Notice title={geo.status === 'denied' ? 'Location is off' : "We couldn't find you"} action={<RetryButton onClick={geo.request} />}>
                  {geo.status === 'denied'
                    ? 'To see landmarks near you, allow location for Laag ta bAI in your browser or phone settings, then tap Try again.'
                    : geo.error}
                </Notice>
              )}
              {geo.status === 'ready' && nearby.isError && <ErrorNotice onRetry={() => nearby.refetch()} />}
              {geo.status === 'ready' && nearby.data?.length === 0 && (
                <Notice title="Nothing within 5 km">No heritage sites are close by yet. Browse the popular ones below.</Notice>
              )}
            </div>
            {(geo.status === 'locating' || (geo.status === 'ready' && nearby.isPending)) && <TileSkeletons />}
            {geo.status === 'ready' && nearby.data && nearby.data.length > 0 && (
              <ul className="flex snap-x scroll-px-6 gap-4 overflow-x-auto px-6 pb-4">
                {nearby.data.map((l) => (
                  <li key={l.id} className="flex">
                    <LandmarkTile landmark={l} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-4 px-6" aria-labelledby="popular-title">
            <h2 id="popular-title" className="text-2xl font-bold text-ink">Popular Landmarks</h2>
            {results.isPending ? (
              <RowSkeletons label="Loading popular landmarks" />
            ) : results.isError ? (
              <ErrorNotice onRetry={() => results.refetch()} />
            ) : results.data.length === 0 ? (
              <Notice title="No landmarks yet">Check back soon.</Notice>
            ) : (
              <ul className="flex flex-col gap-3">
                {[...results.data].sort((a, b) => b.rating - a.rating).map((l) => (
                  <li key={l.id}>
                    <LandmarkRow landmark={l} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}

const MAP_LABEL: Record<GeoState['status'], string> = {
  ready: 'Map of your area. The navy pin marks your current location.',
  locating: 'Map of your area. Finding your location.',
  idle: 'Map of Cebu. Share your location to see where you are.',
  denied: 'Map of Cebu. Location is off.',
  unavailable: 'Map of Cebu. Your location could not be found.',
}

/**
 * Static preview, so it never captures drag gestures and the page scrolls straight past it.
 * shortcut: street art is the Figma placeholder, swap in a real map provider once one is chosen.
 */
function MapPreview({ geo }: { geo: ReturnType<typeof useGeolocation> }) {
  const located = geo.status === 'ready'
  return (
    <section className="px-6" aria-label="Map">
      <div className="relative h-56 overflow-hidden rounded-3xl border border-ivory-line bg-sage-soft shadow-lg">
        <div role="img" aria-label={MAP_LABEL[geo.status]} className="absolute inset-0">
          <svg viewBox="0 0 392 224" preserveAspectRatio="xMidYMid slice" className="size-full" aria-hidden>
            <path d="M300 224C330 190 360 185 392 170V224H300Z" className="fill-sage/50" />
            <g fill="none" strokeLinecap="round" className="stroke-ivory-surface">
              <path strokeWidth={10} d="M-10 200L120 120L260 70L410 20" />
              <path strokeWidth={5} d="M-10 60L150 90L300 150L410 170M90 -10L120 120L150 240M250 -10L260 70L280 240" />
              <path strokeWidth={3} d="M-10 140L60 150L200 180L410 200M30 -10L60 150L40 240M340 -10L330 90L360 240M150 90L200 180" />
            </g>
          </svg>
          {(located || geo.status === 'locating') && (
            <span
              className={`absolute top-1/2 left-1/2 size-6.5 -translate-1/2 rounded-full border-[3px] border-ivory-surface bg-navy shadow-lg ${located ? '' : 'animate-pulse'}`}
            />
          )}
          {!located && geo.status !== 'locating' && (
            <span className="absolute top-1/2 left-1/2 -translate-1/2 rounded-full bg-ivory-surface px-3 py-1 text-xs font-bold whitespace-nowrap text-ink shadow-md">
              {geo.status === 'denied' ? 'Location is off' : 'Location not shared'}
            </span>
          )}
        </div>
        {/* Bottom-right so it sits under a right thumb; hidden until the rationale has been accepted. */}
        {geo.status !== 'idle' && geo.status !== 'denied' && (
          <button
            type="button"
            onClick={geo.request}
            disabled={geo.status === 'locating'}
            aria-label="Recenter on my location"
            className={`absolute right-3 bottom-3 flex size-12 items-center justify-center rounded-xl bg-ivory-surface text-navy shadow-lg disabled:opacity-80 ${focus}`}
          >
            <LocateOutlineIcon size={20} />
          </button>
        )}
      </div>
    </section>
  )
}

function Notice({ title, children, action, alert }: { title: string; children?: ReactNode; action?: ReactNode; alert?: boolean }) {
  return (
    <div role={alert ? 'alert' : undefined} className="flex flex-col gap-2 rounded-2xl border border-ivory-line bg-ivory-surface p-4">
      <p className="text-lg font-bold text-ink">{title}</p>
      {children && <p className="text-sm text-ink-body">{children}</p>}
      {action}
    </div>
  )
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`touch-target self-start text-sm font-bold text-terracotta-ink underline ${focus}`}>
      Try again
    </button>
  )
}

function ErrorNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <Notice alert title="Couldn't load landmarks" action={<RetryButton onClick={onRetry} />}>
      Check your connection and try again.
    </Notice>
  )
}

function TileSkeletons() {
  return (
    <div role="status" className="flex gap-4 overflow-hidden px-6 pb-4">
      <span className="sr-only">Loading nearby landmarks</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-53 w-40 shrink-0 animate-pulse rounded-2xl border border-ivory-line bg-ivory-surface p-3" aria-hidden>
          <div className="h-32 rounded-xl bg-sage-soft" />
        </div>
      ))}
    </div>
  )
}

function RowSkeletons({ label }: { label: string }) {
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex h-26.5 animate-pulse items-center gap-4 rounded-2xl border border-ivory-line bg-ivory-surface p-3" aria-hidden>
          <div className="size-20 rounded-xl bg-sage-soft" />
        </div>
      ))}
    </div>
  )
}
