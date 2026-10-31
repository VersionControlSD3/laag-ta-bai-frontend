import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { LandmarkSummary, Visit } from '@/api/types'
import { useLandmarks, useMe } from '@/api/hooks'
import { SignInPrompt } from '@/components/SignInPrompt'
import { ErrorMessage, Loading } from '@/components/StateMessage'
import {
  ArrowUndoOutlineIcon,
  BookOutlineIcon,
  BookmarkIcon,
  BookmarkOutlineIcon,
  CameraOutlineIcon,
  CheckmarkCircleOutlineIcon,
  CloseOutlineIcon,
  CloudOfflineOutlineIcon,
  CompassOutlineIcon,
  EyeOutlineIcon,
  LocationOutlineIcon,
  StarIcon,
  TimeOutlineIcon,
} from '@/components/icons/ionicons'
import { useAuth } from '@/features/auth/AuthContext'
import { useBookmarks, type Bookmark } from '@/features/bookmarks/useBookmarks'
import { CATEGORY_LABELS, formatDistance } from '@/lib/format'

/**
 * Archives: bookmarks saved on landmark pages (`useBookmarks`) and the visit
 * history from the API (`useMe().recentVisits`). Nothing here is sample data —
 * see PR #21 review.
 */
export default function ArchivesPage() {
  const auth = useAuth()
  const { bookmarks, toggle } = useBookmarks()
  const me = useMe()
  const landmarks = useLandmarks()

  const [isOffline, setIsOffline] = useState(() => !navigator.onLine)
  const [undoToast, setUndoToast] = useState<{ message: string; onUndo: () => void } | null>(null)
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => () => {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current)
  }, [])

  const triggerUndoToast = (message: string, onUndo: () => void) => {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current)
    setUndoToast({ message, onUndo })
    undoTimeoutRef.current = setTimeout(() => setUndoToast(null), 6000)
  }

  const removeBookmark = (bookmark: Bookmark) => {
    toggle(bookmark)
    triggerUndoToast(`Removed "${bookmark.name}" from bookmarks`, () => {
      toggle(bookmark)
      setUndoToast(null)
    })
  }

  const landmarkById = useMemo(
    () => new Map<string, LandmarkSummary>((landmarks.data ?? []).map((landmark) => [landmark.id, landmark])),
    [landmarks.data],
  )

  const signedIn = auth.status === 'signed-in'
  const visits = me.data?.recentVisits ?? []
  const bothEmpty = signedIn && !me.isPending && !me.isError && bookmarks.length === 0 && visits.length === 0

  return (
    <div className="relative -mb-nav min-h-dvh bg-ivory pb-[calc(128px+env(safe-area-inset-bottom))] text-ink">
      {/* Decorative ambient washes, drawn with palette tokens so they follow the theme. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-24 top-10 h-64 w-64 rounded-full bg-sage-soft/40 blur-3xl" />
        <div className="absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-terracotta-soft/40 blur-3xl" />
      </div>

      <a
        href="#main-archive-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-xl focus:bg-navy focus:px-4 focus:py-2.5 focus:font-bold focus:text-on-navy focus:outline-none focus:ring-2 focus:ring-terracotta"
      >
        Skip to archive content
      </a>

      {isOffline && (
        <section
          role="status"
          aria-live="polite"
          className="relative z-10 mx-4 mt-3 flex items-center justify-between gap-3 rounded-2xl border border-terracotta/30 bg-terracotta-soft p-3.5 text-xs text-terracotta-ink"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-terracotta/20 text-terracotta-ink">
              <CloudOfflineOutlineIcon size={16} />
            </span>
            <div>
              <p className="text-sm font-bold">Offline mode active</p>
              <p className="text-ink-body">Showing bookmarked landmarks and cached visit history.</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-terracotta/30 bg-ivory-surface px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-terracotta-ink">
            Cached
          </span>
        </section>
      )}

      <main id="main-archive-content" tabIndex={-1} className="relative z-10 mx-auto max-w-lg px-6 pt-5 focus:outline-none">
        <header className="mb-6">
          <div className="mb-1 text-xs font-bold uppercase tracking-[0.1em] text-terracotta-ink">Your collection</div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Saved Places</h1>
          <p className="mt-1 text-sm leading-relaxed text-ink-body">Places and stories you saved for later.</p>
        </header>

        {bothEmpty ? (
          <EmptyBothView />
        ) : (
          <div className="space-y-10">
            <FavoritesSection bookmarks={bookmarks} onRemove={removeBookmark} />
            <hr className="border-t-2 border-ivory-line" aria-hidden="true" />
            <HistorySection
              status={auth.status}
              visits={visits}
              isPending={me.isPending}
              isError={me.isError}
              error={me.error}
              onRetry={() => me.refetch()}
              landmarkById={landmarkById}
            />
          </div>
        )}
      </main>

      {undoToast && (
        <aside role="status" aria-live="polite" className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-md">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-on-navy/15 bg-navy px-4 py-3 text-on-navy shadow-xl">
            <span className="flex-1 truncate text-xs font-semibold">{undoToast.message}</span>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={undoToast.onUndo}
                className="flex min-h-12 min-w-12 items-center gap-1.5 rounded-xl border border-terracotta/40 bg-terracotta-soft px-3 text-xs font-bold text-terracotta-ink transition-colors hover:bg-terracotta/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-navy"
              >
                <ArrowUndoOutlineIcon size={16} />
                <span>Undo</span>
              </button>
              <button
                type="button"
                onClick={() => setUndoToast(null)}
                aria-label="Dismiss undo message"
                className="flex min-h-12 min-w-12 items-center justify-center rounded-xl text-on-navy/70 transition-colors hover:text-on-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-navy"
              >
                <CloseOutlineIcon size={18} />
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}

function FavoritesSection({ bookmarks, onRemove }: { bookmarks: Bookmark[]; onRemove: (bookmark: Bookmark) => void }) {
  return (
    <section aria-labelledby="favorites-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookmarkOutlineIcon size={20} className="text-terracotta" />
          <h2 id="favorites-heading" className="text-xl font-bold tracking-tight text-ink">
            Bookmarked Landmarks
          </h2>
        </div>
        <span className="shrink-0 rounded-full border border-ivory-line bg-navy-soft px-2.5 py-1 text-xs font-bold text-ink-muted">
          {bookmarks.length} {bookmarks.length === 1 ? 'place' : 'places'}
        </span>
      </div>

      {bookmarks.length === 0 ? (
        <EmptyFavoritesView />
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {bookmarks.map((bookmark) => (
            <PlaceCard key={bookmark.id} bookmark={bookmark} onRemove={() => onRemove(bookmark)} />
          ))}
        </div>
      )}
    </section>
  )
}

function PlaceCard({ bookmark, onRemove }: { bookmark: Bookmark; onRemove: () => void }) {
  const distance = formatDistance(bookmark.distanceMeters)
  return (
    <article
      aria-label={bookmark.name}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-ivory-line bg-ivory-surface shadow-sm transition-shadow duration-200 hover:shadow-md"
    >
      <div className="relative h-44 w-full overflow-hidden bg-sage-soft">
        {bookmark.imageUrl ? (
          <img
            src={bookmark.imageUrl}
            alt={`Photo of ${bookmark.name}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sage-deep">
            <CompassOutlineIcon size={40} />
          </div>
        )}

        <span className="absolute left-3 top-3 flex h-7 items-center rounded-full bg-terracotta-soft px-3 text-xs font-bold tracking-wide text-terracotta-ink shadow-sm">
          {CATEGORY_LABELS[bookmark.category] ?? bookmark.category}
        </span>

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onRemove()
          }}
          aria-label={`Remove ${bookmark.name} from bookmarks`}
          aria-pressed="true"
          title="Remove bookmark"
          className="absolute right-2 top-2 flex min-h-12 min-w-12 items-center justify-center rounded-full border border-on-navy/30 bg-navy/85 text-on-navy shadow-md backdrop-blur-md transition-colors hover:bg-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2"
        >
          <BookmarkIcon size={20} />
        </button>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-navy/60 to-transparent" aria-hidden="true" />
      </div>

      <div className="flex items-center justify-between gap-3 bg-ivory-surface p-4">
        <div className="min-w-0 flex-1">
          <Link
            to={`/landmarks/${bookmark.id}`}
            className="block truncate rounded-md text-lg font-bold text-ink transition-colors hover:text-terracotta-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
          >
            {bookmark.name}
          </Link>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
            <LocationOutlineIcon size={14} className="shrink-0 text-terracotta-ink" />
            <span className="truncate">
              {bookmark.district}
              {distance && ` · ${distance}`}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 rounded-xl border border-ivory-line bg-navy-soft px-2.5 py-1.5">
          <StarIcon size={16} className="text-terracotta" />
          <span className="text-xs font-bold text-terracotta-ink">{bookmark.rating.toFixed(1)}</span>
        </div>
      </div>
    </article>
  )
}

type HistorySectionProps = {
  status: 'loading' | 'signed-in' | 'signed-out'
  visits: Visit[]
  isPending: boolean
  isError: boolean
  error: unknown
  onRetry: () => void
  landmarkById: Map<string, LandmarkSummary>
}

function HistorySection({ status, visits, isPending, isError, error, onRetry, landmarkById }: HistorySectionProps) {
  const groups = useMemo(() => groupByDay(visits), [visits])

  return (
    <section aria-labelledby="history-heading">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TimeOutlineIcon size={20} className="text-terracotta" />
          <h2 id="history-heading" className="text-xl font-bold tracking-tight text-ink">
            Visit History
          </h2>
        </div>
        {status === 'signed-in' && visits.length > 0 && (
          <span className="shrink-0 rounded-full border border-ivory-line bg-navy-soft px-2.5 py-1 text-xs font-bold text-ink-muted">
            {visits.length} {visits.length === 1 ? 'activity' : 'activities'}
          </span>
        )}
      </div>
      <p className="mb-4 text-xs text-ink-muted">Your scans, visits and viewed stories, newest first.</p>

      {status === 'loading' ? (
        <Loading label="Checking your account…" />
      ) : status !== 'signed-in' ? (
        <SignInPrompt message="Sign in to keep a history of the places you visit." />
      ) : isPending ? (
        <Loading label="Loading your visit history…" />
      ) : isError ? (
        <ErrorMessage error={error} onRetry={onRetry} />
      ) : visits.length === 0 ? (
        <EmptyHistoryView />
      ) : (
        <div className="space-y-6">
          {groups.map(([label, items]) => (
            <div key={label} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-terracotta-ink">{label}</span>
                <div className="h-px flex-1 bg-ivory-line" aria-hidden="true" />
                <span className="text-xs font-semibold text-ink-muted">
                  {items.length} {items.length === 1 ? 'activity' : 'activities'}
                </span>
              </div>

              <ul className="space-y-2.5">
                {items.map((visit) => (
                  <HistoryRow key={visit.id} visit={visit} landmark={landmarkById.get(visit.landmarkId)} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function HistoryRow({ visit, landmark }: { visit: Visit; landmark?: LandmarkSummary }) {
  const name = landmark?.name ?? visit.landmarkId
  const createdAt = new Date(visit.createdAt)
  return (
    <li>
      <Link
        to={`/landmarks/${visit.landmarkId}`}
        className="flex items-center gap-3 rounded-2xl border border-ivory-line bg-ivory-surface p-3 transition-colors hover:bg-navy-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-ivory-line bg-sage-soft">
          {landmark?.imageUrl ? (
            <img src={landmark.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sage-deep">
              <LocationOutlineIcon size={20} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-bold text-ink">{name}</span>
            {visit.xpAwarded > 0 && (
              <span className="shrink-0 rounded-md bg-sage-soft px-1.5 py-0.5 text-xs font-bold text-sage-deep">
                +{visit.xpAwarded} XP
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
            <span>{createdAt.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}</span>
            <span aria-hidden="true">•</span>
            <span className="truncate">{landmark?.district ?? 'Cebu'}</span>
          </div>

          <div className="mt-2">
            <ActivityBadge source={visit.source} />
          </div>
        </div>
      </Link>
    </li>
  )
}

/** Scanned / Visited / Viewed differ by icon and label, not colour alone (WCAG 1.4.1). */
function ActivityBadge({ source }: { source: Visit['source'] }) {
  const activity =
    source === 'scan'
      ? { label: 'Scanned', icon: <CameraOutlineIcon size={14} />, tone: 'border-navy/25 bg-navy-soft text-navy' }
      : source === 'manual'
        ? { label: 'Visited', icon: <CheckmarkCircleOutlineIcon size={14} />, tone: 'border-sage-deep/35 bg-sage-soft text-sage-deep' }
        : { label: 'Viewed', icon: <EyeOutlineIcon size={14} />, tone: 'border-terracotta/35 bg-terracotta-soft text-terracotta-ink' }

  return (
    <span
      aria-label={`Activity type: ${activity.label}`}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-bold ${activity.tone}`}
    >
      {activity.icon}
      <span>{activity.label}</span>
    </span>
  )
}

function EmptyFavoritesView() {
  return (
    <div className="rounded-3xl border border-ivory-line bg-ivory-surface p-8 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-terracotta-soft text-terracotta-ink">
        <BookmarkOutlineIcon size={28} />
      </div>
      <h3 className="text-base font-bold text-ink">No saved places yet</h3>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-ink-muted">
        Tap the bookmark on any landmark to save it here for quick offline access and itinerary planning.
      </p>
      <div className="mt-5 flex items-center justify-center">
        <Link
          to="/"
          className="flex min-h-12 items-center rounded-2xl bg-navy px-4 text-xs font-bold text-on-navy transition-colors hover:bg-navy-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
        >
          Explore landmarks
        </Link>
      </div>
    </div>
  )
}

function EmptyHistoryView() {
  return (
    <div className="rounded-3xl border border-ivory-line bg-ivory-surface p-8 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-soft text-sage-deep">
        <TimeOutlineIcon size={28} />
      </div>
      <h3 className="text-base font-bold text-ink">No activity history yet</h3>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-ink-muted">
        Landmarks you scan with the camera, check into, or read about will appear here chronologically.
      </p>
      <div className="mt-5 flex items-center justify-center">
        <Link
          to="/scan"
          className="flex min-h-12 items-center rounded-2xl bg-navy px-4 text-xs font-bold text-on-navy transition-colors hover:bg-navy-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
        >
          Scan a landmark
        </Link>
      </div>
    </div>
  )
}

function EmptyBothView() {
  return (
    <div className="my-6 rounded-3xl border border-ivory-line bg-ivory-surface p-10 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-terracotta-soft text-terracotta-ink">
        <BookOutlineIcon size={32} />
      </div>
      <h2 className="text-2xl font-extrabold text-ink">Your archives are empty</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-body">
        Start building your Cebu journey! Bookmark heritage sites to read offline and scan landmarks with your camera as you
        explore to grow your travel history.
      </p>

      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          to="/"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-navy px-5 text-sm font-bold text-on-navy transition-colors hover:bg-navy-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta sm:w-auto"
        >
          <CompassOutlineIcon size={18} />
          <span>Explore landmarks</span>
        </Link>
        <Link
          to="/scan"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-ivory-line bg-ivory-surface px-5 text-sm font-bold text-ink transition-colors hover:bg-navy-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta sm:w-auto"
        >
          <CameraOutlineIcon size={18} />
          <span>Scan landmarks</span>
        </Link>
      </div>
    </div>
  )
}

/** Groups visits into Today / Yesterday / date, newest first. */
function groupByDay(visits: Visit[]): [string, Visit[]][] {
  const sorted = [...visits].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const groups = new Map<string, Visit[]>()
  for (const visit of sorted) {
    const label = dayLabel(new Date(visit.createdAt))
    const items = groups.get(label)
    if (items) items.push(visit)
    else groups.set(label, [visit])
  }
  return [...groups.entries()]
}

function dayLabel(date: Date): string {
  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
  const today = new Date()
  const days = Math.round((startOfDay(today) - startOfDay(date)) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
}
