import { useDeferredValue, useEffect, useState } from 'react'
import { LocateFixed, MapPin, Search, SlidersHorizontal } from 'lucide-react'
import { useLandmarks } from '@/api/hooks'
import type { LandmarkCategory } from '@/api/types'
import { LandmarkRow, LandmarkTile } from '@/components/LandmarkCard'
import { PageHeader } from '@/components/PageHeader'
import { ErrorMessage, Loading } from '@/components/StateMessage'
import { useGeolocation } from '@/hooks/useGeolocation'
import { CATEGORY_LABELS } from '@/lib/format'

const CATEGORIES = Object.keys(CATEGORY_LABELS) as LandmarkCategory[]

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

  return (
    <div>
      <PageHeader title="Explore" subtitle="Discover the heart of Cebu" />

      <div className="px-5">
        <label className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4">
          <Search size={20} className="text-coral" aria-hidden />
          <span className="sr-only">Search landmarks</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search landmarks, museums, districts…"
            className="h-12 flex-1 bg-transparent outline-none placeholder:text-muted"
          />
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            aria-label="Filters"
            className="touch-target -mr-3 flex items-center justify-center text-coral"
          >
            <SlidersHorizontal size={20} aria-hidden />
          </button>
        </label>

        {showFilters && (
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(category === c ? undefined : c)}
                aria-pressed={category === c}
                className={`min-h-10 rounded-full border px-4 text-sm font-semibold ${category === c ? 'border-primary bg-primary text-on-primary' : 'border-line bg-surface'}`}
              >
                {CATEGORY_LABELS[c]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFreeOnly((v) => !v)}
              aria-pressed={freeOnly}
              className={`min-h-10 rounded-full border px-4 text-sm font-semibold ${freeOnly ? 'border-primary bg-primary text-on-primary' : 'border-line bg-surface'}`}
            >
              Free entry
            </button>
          </div>
        )}
      </div>

      {filtering ? (
        <section className="mt-6 space-y-3 px-5" aria-label="Search results">
          {results.isPending ? (
            <Loading />
          ) : results.isError ? (
            <ErrorMessage error={results.error} onRetry={() => results.refetch()} />
          ) : results.data.length === 0 ? (
            <p className="py-8 text-center text-muted">No landmarks match your search.</p>
          ) : (
            results.data.map((l) => <LandmarkRow key={l.id} landmark={l} />)
          )}
        </section>
      ) : (
        <>
          {/* Map placeholder: Google Maps (SRS 3.1.4.2) is not wired up yet. */}
          <section className="mt-6 px-5">
            <div className="relative flex h-48 flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl border border-line bg-surface text-center">
              <MapPin size={32} className="text-primary" aria-hidden />
              <p className="font-semibold">Interactive map coming soon</p>
              <p className="px-6 text-xs text-muted">Google Maps integration is planned. Landmarks below are sorted by distance when location is on.</p>
            </div>
          </section>

          {geo.status !== 'ready' && (
            <div className="mx-5 mt-4 flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
              <LocateFixed className="shrink-0 text-primary" aria-hidden />
              <p className="flex-1 text-sm">
                {geo.status === 'denied'
                  ? 'Location is off. Turn it on in your browser settings to see what is nearby.'
                  : 'Share your location to find heritage sites near you. It stays on your device and is only used for distances.'}
              </p>
              {geo.status !== 'denied' && (
                <button type="button" onClick={geo.request} className="touch-target rounded-xl bg-primary px-3 text-sm font-bold text-on-primary">
                  {geo.status === 'locating' ? '…' : 'Allow'}
                </button>
              )}
            </div>
          )}

          {geo.status === 'ready' && (
            <section className="mt-8" aria-labelledby="nearby-title">
              <div className="mb-3 px-5">
                <h2 id="nearby-title" className="text-2xl font-bold">Nearby You</h2>
                <p className="text-sm text-muted">Within a 5 km radius</p>
              </div>
              {nearby.isPending ? (
                <Loading />
              ) : nearby.isError ? (
                <ErrorMessage error={nearby.error} onRetry={() => nearby.refetch()} />
              ) : nearby.data.length === 0 ? (
                <p className="px-5 text-sm text-muted">No heritage sites within 5 km yet.</p>
              ) : (
                <div className="flex snap-x gap-4 overflow-x-auto px-5 pb-2">
                  {nearby.data.map((l) => <LandmarkTile key={l.id} landmark={l} />)}
                </div>
              )}
            </section>
          )}

          <section className="mt-8 px-5" aria-labelledby="popular-title">
            <h2 id="popular-title" className="text-2xl font-bold">Popular Landmarks</h2>
            <p className="mb-3 text-sm text-muted">Must-visit heritage sites</p>
            {results.isPending ? (
              <Loading />
            ) : results.isError ? (
              <ErrorMessage error={results.error} onRetry={() => results.refetch()} />
            ) : (
              <div className="space-y-3">
                {[...results.data].sort((a, b) => b.rating - a.rating).map((l) => <LandmarkRow key={l.id} landmark={l} />)}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
