import { useDeferredValue, useEffect, useState, type ReactNode } from 'react'
import { useLandmarks } from '@/api/hooks'
import type { LandmarkCategory } from '@/api/types'
import { ExploreMap } from '@/components/ExploreMap'
import { OptionsOutlineIcon, SearchIcon } from '@/components/icons/ionicons'
import { LandmarkRow, LandmarkTile } from '@/components/LandmarkCard'
import { usePreferences } from '@/features/preferences/PreferencesContext'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useT } from '@/i18n'
import { CATEGORIES } from '@/lib/format'

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy'

export default function ExplorePage() {
  const geo = useGeolocation({ maximumAge: 0 })
  const { resolvedTheme } = usePreferences()
  const t = useT()
  const e = t.explore
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
  // Waits for coordinates: without them the radius means nothing and the request is wasted data.
  const nearby = useLandmarks({ ...coords, radiusKm: 5, limit: 10 }, { enabled: geo.status === 'ready' })
  const results = useLandmarks({ q: q || undefined, category, free: freeOnly || undefined, ...coords })
  const filtering = Boolean(q || category || freeOnly)

  const chip = (pressed: boolean) =>
    `min-h-12 rounded-full border px-4 text-sm font-bold ${focus} ${pressed ? 'border-navy bg-navy text-on-navy' : 'border-ivory-line bg-ivory-surface text-ink'}`

  return (
    <div className="bleed-under-nav flex min-h-dvh flex-col gap-6 bg-ivory pt-[max(3rem,env(safe-area-inset-top))]">
      <header className="flex flex-col items-center gap-1 px-6 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-ink">{e.title}</h1>
        <p className="text-base text-ink-muted">{e.subtitle}</p>
      </header>

      <div className="px-6">
        {/* The Filters button sits outside the <label> so its name doesn't join the input's. */}
        <div className="flex items-center gap-3 rounded-2xl border border-line-strong bg-ivory-surface pl-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-navy">
          <label className="flex min-w-0 flex-1 items-center gap-3">
            <SearchIcon size={20} className="shrink-0 text-terracotta" />
            <span className="sr-only">{e.search}</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={e.searchPlaceholder}
              className="h-12 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-muted"
            />
          </label>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            aria-label={e.filters}
            className={`touch-target flex shrink-0 items-center justify-center rounded-2xl text-terracotta ${focus}`}
          >
            <OptionsOutlineIcon size={20} />
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={e.filterByCategory}>
            {CATEGORIES.map((c) => (
              <button key={c} type="button" onClick={() => setCategory(category === c ? undefined : c)} aria-pressed={category === c} className={chip(category === c)}>
                {t.common.categories[c]}
              </button>
            ))}
            <button type="button" onClick={() => setFreeOnly((v) => !v)} aria-pressed={freeOnly} className={chip(freeOnly)}>
              {e.freeEntry}
            </button>
          </div>
        )}
      </div>

      {/* Google Maps sets its color scheme only when the map is created. */}
      <ExploreMap
        key={resolvedTheme}
        theme={resolvedTheme}
        hidden={filtering}
        location={geo.coords}
        locating={geo.status === 'locating'}
        onRefreshLocation={geo.request}
      />

      {filtering ? (
        <section className="flex flex-col gap-3 px-6" aria-label={e.results}>
          {results.isPending ? (
            <RowSkeletons label={e.searching} />
          ) : results.isError ? (
            <ErrorNotice onRetry={() => results.refetch()} />
          ) : results.data.length === 0 ? (
            <Notice title={e.noMatches}>{e.noMatchesBody}</Notice>
          ) : (
            results.data.map((l) => <LandmarkRow key={l.id} landmark={l} />)
          )}
        </section>
      ) : (
        <>
          <section className="flex flex-col gap-4" aria-labelledby="nearby-title">
            <div className="px-6">
              <h2 id="nearby-title" className="text-2xl font-bold text-ink">{e.nearby}</h2>
              <p className="text-sm text-ink-muted">{e.radius}</p>
            </div>
            <div className="px-6 empty:hidden">
              {geo.status === 'idle' && (
                <Notice
                  title={e.seeNear}
                  action={
                    <button type="button" onClick={geo.request} className={`h-12 w-full rounded-xl bg-navy px-6 text-base font-bold tracking-[0.05em] text-on-navy uppercase shadow-navy active:bg-navy-pressed ${focus}`}>
                      {e.shareLocation}
                    </button>
                  }
                >
                  {e.rationale}
                </Notice>
              )}
              {(geo.status === 'denied' || geo.status === 'unavailable') && (
                <Notice title={geo.status === 'denied' ? e.locationOff : e.notFound} action={<RetryButton onClick={geo.request} />}>
                  {geo.status === 'denied'
                    ? e.deniedBody
                    : geo.error && t.common.location[geo.error]}
                </Notice>
              )}
              {geo.status === 'ready' && nearby.isError && <ErrorNotice onRetry={() => nearby.refetch()} />}
              {geo.status === 'ready' && nearby.data?.length === 0 && (
                <Notice title={e.nothingNear}>{e.nothingNearBody}</Notice>
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
            <h2 id="popular-title" className="text-2xl font-bold text-ink">{e.popular}</h2>
            {results.isPending ? (
              <RowSkeletons label={e.loadingPopular} />
            ) : results.isError ? (
              <ErrorNotice onRetry={() => results.refetch()} />
            ) : results.data.length === 0 ? (
              <Notice title={e.noLandmarks}>{e.checkBack}</Notice>
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
  const t = useT()
  return (
    <button type="button" onClick={onClick} className={`touch-target self-start text-sm font-bold text-terracotta-ink underline ${focus}`}>
      {t.common.tryAgain}
    </button>
  )
}

function ErrorNotice({ onRetry }: { onRetry: () => void }) {
  const e = useT().explore
  return (
    <Notice alert title={e.loadFailed} action={<RetryButton onClick={onRetry} />}>
      {e.checkConnection}
    </Notice>
  )
}

function TileSkeletons() {
  const e = useT().explore
  return (
    <div role="status" className="flex gap-4 overflow-hidden px-6 pb-4">
      <span className="sr-only">{e.loadingNearby}</span>
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
