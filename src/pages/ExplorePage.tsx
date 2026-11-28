import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useLandmarks } from '@/api/hooks'
import type { LandmarkCategory } from '@/api/types'
import { ExploreMap } from '@/components/ExploreMap'
import {
  BookmarkOutlineIcon,
  CameraOutlineIcon,
  LocationOutlineIcon,
  SearchIcon,
} from '@/components/icons/ionicons'
import { FeaturedLandmarkCard, LandmarkRow, LandmarkTile } from '@/components/LandmarkCard'
import { usePreferences } from '@/features/preferences/PreferencesContext'
import { useGeolocation } from '@/hooks/useGeolocation'
import { CATEGORY_LABELS } from '@/lib/format'

const CATEGORIES = Object.keys(CATEGORY_LABELS) as LandmarkCategory[]
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy'
const PRIVACY = 'Your coordinates are sent to our server only to sort nearby landmarks and verify scans.'

export default function ExplorePage() {
  const geo = useGeolocation({ maximumAge: 0 })
  const { resolvedTheme } = usePreferences()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<LandmarkCategory | undefined>()
  const [freeOnly, setFreeOnly] = useState(false)
  const q = useDeferredValue(search)

  const { rationaleAccepted, status, request } = geo
  useEffect(() => {
    if (rationaleAccepted && status === 'idle') request()
  }, [rationaleAccepted, status, request])

  const coords = geo.coords ? { lat: geo.coords.lat, lng: geo.coords.lng } : {}
  // Waits for coordinates: without them the radius means nothing and the request is wasted data.
  const nearby = useLandmarks({ ...coords, radiusKm: 5, limit: 10 }, { enabled: geo.status === 'ready' })
  const results = useLandmarks({ q: q || undefined, category, free: freeOnly || undefined, ...coords })
  const filtering = Boolean(q.trim() || category || freeOnly)

  const sortedPopular = useMemo(
    () => (results.data ? [...results.data].sort((a, b) => b.rating - a.rating) : []),
    [results.data],
  )
  const featured = sortedPopular[0]
  // When multiple landmarks exist, omit the Today spotlight landmark from Popular so it isn't shown twice.
  const popularLandmarks = useMemo(
    () => (sortedPopular.length > 1 ? sortedPopular.slice(1) : sortedPopular),
    [sortedPopular],
  )

  const chip = (pressed: boolean) =>
    `flex h-12 shrink-0 items-center justify-center rounded-full border px-4 text-xs leading-4 font-bold whitespace-nowrap transition-colors ${focus} ${
      pressed ? 'border-navy bg-navy text-on-navy' : 'border-ivory-line bg-ivory-deep text-ink hover:bg-ivory-surface'
    }`

  const clearFilters = () => {
    setSearch('')
    setCategory(undefined)
    setFreeOnly(false)
  }

  const heroImage = resolvedTheme === 'dark' ? '/authenticationBG/LoginNight.webp' : '/authenticationBG/LoginDay.webp'

  return (
    <div className="bleed-under-nav flex min-h-dvh flex-col gap-5.5 bg-ivory pb-[calc(var(--nav-clearance)+1.5rem)]">
      {/* Top Hero Banner + Overlapping Search Bar */}
      <div className="flex flex-col">
        <header
          data-palette="light"
          className="relative -mb-7 flex flex-col gap-5 overflow-hidden px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-14"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <img src={heroImage} alt="" className="size-full object-cover" />
            <div className="absolute inset-0 bg-linear-to-b from-navy/65 via-navy/25 to-terracotta/50" />
          </div>

          <div className="relative flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-ivory-surface/95 px-3 py-1.5 text-xs leading-4 font-semibold text-navy shadow-xs">
              <LocationOutlineIcon size={14} className="shrink-0 text-terracotta" />
              Cebu, PH
            </span>
            <Link
              to="/archives"
              aria-label="Saved landmarks"
              className={`touch-target flex size-12 items-center justify-center rounded-full bg-ivory-surface/95 text-navy shadow-xs transition-transform active:scale-95 ${focus}`}
            >
              <BookmarkOutlineIcon size={20} />
            </Link>
          </div>

          <div className="relative flex flex-col items-center gap-1 text-center text-on-navy">
            <h1 className="font-display text-[2.875rem] leading-[3.125rem] font-bold tracking-tight drop-shadow-xs">
              Explore
            </h1>
            <p className="font-display text-lg leading-[1.375rem] italic text-on-navy/95 drop-shadow-xs">
              Discover the heart of Cebu
            </p>
          </div>
        </header>

        {/* Overlapping Floating Search Bar + Quick Filter Chips */}
        <div className="relative z-10 flex flex-col gap-3 px-5">
          <div className="flex h-14 items-center gap-2 rounded-full border border-ivory-line bg-ivory-surface px-4 shadow-card focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-navy">
            <label className="flex min-w-0 flex-1 items-center gap-2.5">
              <SearchIcon size={18} className="shrink-0 text-terracotta" />
              <span className="sr-only">Search landmarks</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search landmarks"
                className="h-12 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
              />
            </label>
          </div>

          {/* Horizontal Quick Filter Chips Row (AI Mode link sits outside the filter group) */}
          <div className="no-scrollbar -mx-5 flex items-center gap-2 overflow-x-auto px-5">
            <Link
              to="/scan"
              className={`flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-full border border-terracotta bg-terracotta-soft px-4 text-xs leading-4 font-bold whitespace-nowrap text-terracotta-ink transition-colors hover:bg-terracotta/20 ${focus}`}
            >
              <CameraOutlineIcon size={15} />
              AI Mode
            </Link>
            <div className="flex items-center gap-2" role="group" aria-label="Quick filters">
              <button type="button" onClick={() => setFreeOnly((v) => !v)} aria-pressed={freeOnly} className={chip(freeOnly)}>
                Free entry
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(category === c ? undefined : c)}
                  aria-pressed={category === c}
                  className={chip(category === c)}
                >
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {filtering ? (
        <section className="flex flex-col gap-3 px-5" aria-label="Search results">
          {results.isPending ? (
            <RowSkeletons label="Searching landmarks" />
          ) : results.isError ? (
            <ErrorNotice onRetry={() => results.refetch()} />
          ) : results.data.length === 0 ? (
            <Notice
              title="No matches"
              action={
                <button
                  type="button"
                  onClick={clearFilters}
                  className={`touch-target self-start text-sm font-bold text-terracotta-ink underline ${focus}`}
                >
                  Clear filters
                </button>
              }
            >
              Try another name, or clear the filters.
            </Notice>
          ) : (
            results.data.map((l) => <LandmarkRow key={l.id} landmark={l} />)
          )}
        </section>
      ) : (
        <>
          {/* Today Featured Spotlight Section */}
          {featured && (
            <section className="flex flex-col gap-2.5 px-5" aria-labelledby="today-title">
              <h2 id="today-title" className="font-display text-[1.625rem] leading-8 font-bold text-ink">
                Today
              </h2>
              <FeaturedLandmarkCard landmark={featured} />
            </section>
          )}

          {/* Map Preview Card (below Today, above Nearby You) */}
          {/* Google Maps sets its color scheme only when the map is created. */}
          <ExploreMap
            key={resolvedTheme}
            theme={resolvedTheme}
            hidden={false}
            landmarks={results.data ?? []}
            location={geo.coords}
            locating={geo.status === 'locating'}
            locationStatus={geo.status}
            onRefreshLocation={geo.request}
          />

          {/* Nearby You Section */}
          <section className="flex flex-col gap-3" aria-labelledby="nearby-title">
            <div className="px-5">
              <h2 id="nearby-title" className="font-display text-[1.625rem] leading-8 font-bold text-ink">
                Nearby You
              </h2>
              <p className="text-xs leading-4 text-ink-muted">Within a 5 km radius</p>
            </div>
            <div className="px-5 empty:hidden">
              {geo.status === 'idle' && (
                <Notice
                  title="See what's near you"
                  action={
                    <button
                      type="button"
                      onClick={geo.request}
                      className={`mt-1 h-12 w-full rounded-xl bg-navy px-6 text-sm font-bold tracking-[0.05em] text-on-navy uppercase shadow-navy active:bg-navy-pressed ${focus}`}
                    >
                      Share location
                    </button>
                  }
                >
                  Share your location to see where you are and sort landmarks by distance. {PRIVACY} Google Maps receives the map area you view.
                </Notice>
              )}
              {(geo.status === 'denied' || geo.status === 'unavailable') && (
                <Notice
                  title={geo.status === 'denied' ? 'Location is off' : "We couldn't find you"}
                  action={<RetryButton onClick={geo.request} />}
                >
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
              <ul className="no-scrollbar flex snap-x scroll-px-5 gap-3.5 overflow-x-auto px-5 pb-2">
                {nearby.data.map((l) => (
                  <li key={l.id} className="flex">
                    <LandmarkTile landmark={l} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Popular Landmarks Section */}
          <section className="flex flex-col gap-3 px-5" aria-labelledby="popular-title">
            <div className="flex items-center justify-between gap-2">
              <h2 id="popular-title" className="font-display text-[1.625rem] leading-8 font-bold text-ink">
                Popular Landmarks
              </h2>
              {popularLandmarks.length > 0 && (
                <span className="font-mono text-xs leading-4 font-medium text-ink-muted">
                  {popularLandmarks.length} {popularLandmarks.length === 1 ? 'spot' : 'spots'}
                </span>
              )}
            </div>
            {results.isPending ? (
              <RowSkeletons label="Loading popular landmarks" />
            ) : results.isError ? (
              <ErrorNotice onRetry={() => results.refetch()} />
            ) : popularLandmarks.length === 0 ? (
              <Notice title="No landmarks yet">Check back soon.</Notice>
            ) : (
              <ul className="flex flex-col gap-3.5">
                {popularLandmarks.map((l) => (
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

function Notice({ title, children, action, alert }: { title: string; children?: ReactNode; action?: ReactNode; alert?: boolean }) {
  return (
    <div
      role={alert ? 'alert' : undefined}
      className={`flex flex-col gap-2 rounded-2xl border px-4 py-4 ${
        alert ? 'border-danger-line bg-danger-soft text-danger' : 'border-ivory-line bg-ivory-surface'
      }`}
    >
      <p className={`text-base font-bold ${alert ? 'text-danger' : 'text-ink'}`}>{title}</p>
      {children && <p className={`text-sm ${alert ? 'text-danger' : 'text-ink-body'}`}>{children}</p>}
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
    <div role="status" className="flex gap-3.5 overflow-hidden px-5 pb-2">
      <span className="sr-only">Loading nearby landmarks</span>
      {[0, 1].map((i) => (
        <div
          key={i}
          className="h-64 w-52 shrink-0 animate-pulse rounded-3xl border border-ivory-line bg-sage-soft motion-reduce:animate-none"
          aria-hidden
        />
      ))}
    </div>
  )
}

function RowSkeletons({ label }: { label: string }) {
  return (
    <div role="status" className="flex flex-col gap-3.5">
      <span className="sr-only">{label}</span>
      {[0, 1].map((i) => (
        <div
          key={i}
          className="h-72 animate-pulse rounded-3xl border border-ivory-line bg-ivory-surface p-3 motion-reduce:animate-none"
          aria-hidden
        >
          <div className="h-48 rounded-2xl bg-sage-soft" />
        </div>
      ))}
    </div>
  )
}
