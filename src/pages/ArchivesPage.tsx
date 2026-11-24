import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { LandmarkSummary, Visit } from '@/api/types'
import { useLandmarks, useMe } from '@/api/hooks'
import { BookmarkIcon, CompassOutlineIcon, LocationIcon, LocationOutlineIcon, StarIcon } from '@/components/icons/ionicons'
import { useAuth } from '@/features/auth/AuthContext'
import { useBookmarks, type Bookmark } from '@/features/bookmarks/useBookmarks'
import { CATEGORY_LABELS, formatDistance } from '@/lib/format'

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy'
const eyebrow = 'text-xs font-bold tracking-[0.1em] text-terracotta-ink uppercase'

/**
 * Archives (UI Redesign #6, Figma 558:3513 / 558:3553): bookmarks saved on landmark pages
 * (`useBookmarks`) and the visit history from the API (`useMe().recentVisits`). Nothing here is
 * sample data; see PR #21 review.
 */
export default function ArchivesPage() {
  const auth = useAuth()
  const { bookmarks, toggle } = useBookmarks()
  const me = useMe()
  const landmarks = useLandmarks()

  const [isOffline, setIsOffline] = useState(() => !navigator.onLine)
  const [removed, setRemoved] = useState<Bookmark | null>(null)
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

  const removeBookmark = (bookmark: Bookmark) => {
    toggle(bookmark)
    setRemoved(bookmark)
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current)
    undoTimeoutRef.current = setTimeout(() => setRemoved(null), 6000)
  }

  const undoRemove = () => {
    if (removed) toggle(removed)
    setRemoved(null)
  }

  const landmarkById = useMemo(
    () => new Map<string, LandmarkSummary>((landmarks.data ?? []).map((landmark) => [landmark.id, landmark])),
    [landmarks.data],
  )

  return (
    <div className="bleed-under-nav flex min-h-dvh flex-col gap-4 bg-ivory px-6 pt-[max(3rem,env(safe-area-inset-top))] text-ink">
      {isOffline && (
        <Notice tone="offline" role="status" title="Offline mode active">
          Showing bookmarked landmarks and cached visit history.
        </Notice>
      )}

      <header className="flex flex-col gap-1">
        <p className={eyebrow}>Your collection</p>
        <h1 className="text-3xl font-extrabold tracking-[-0.02em]">Saved Places</h1>
        <p className="text-sm text-ink-body">Places and stories you saved for later.</p>
      </header>

      <BookmarksSection bookmarks={bookmarks} onRemove={removeBookmark} />

      <section aria-label="Visit history" className="flex flex-col gap-4">
        {auth.status === 'loading' ? (
          <Notice role="status" title="Checking your account…" />
        ) : auth.status !== 'signed-in' ? (
          <Notice
            title="Sign in to keep visit history"
            action={
              <Link to="/login" className={`${actionLink} ${focusRing}`}>
                Sign in
              </Link>
            }
          >
            Sign in to keep a history of the places you visit across Cebu.
          </Notice>
        ) : me.isPending ? (
          <Notice role="status" title="Loading your visit history…" />
        ) : me.isError ? (
          <Notice
            tone="error"
            role="alert"
            title="Couldn't load your visit history"
            action={
              <button type="button" onClick={() => me.refetch()} className={`${actionLink} ${focusRing}`}>
                Try again
              </button>
            }
          >
            {me.error instanceof Error ? me.error.message : 'Something went wrong.'}
          </Notice>
        ) : me.data.recentVisits.length === 0 ? (
          <Notice title="No visits yet">Landmarks you scan, check into or read about will appear here.</Notice>
        ) : (
          <HistoryList visits={me.data.recentVisits} landmarkById={landmarkById} />
        )}
      </section>

      {/* Mounted up front so screen readers announce the toast when it appears. */}
      <div
        role="status"
        className="fixed inset-x-6 bottom-[var(--nav-clearance)] z-40 mx-auto max-w-[calc(28rem-3rem)]"
      >
        {removed && (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-navy py-3 pr-3 pl-4 text-on-navy shadow-navy">
            <p className="min-w-0 truncate text-xs font-bold">Removed "{removed.name}"</p>
            {/* The ::before box stretches the 28px pill to a 48px tap target without changing the layout. */}
            <button
              type="button"
              onClick={undoRemove}
              className={`relative shrink-0 rounded-[10px] bg-terracotta-soft px-3 py-1.5 text-xs font-bold text-terracotta-ink before:absolute before:inset-x-0 before:-inset-y-2.5 ${focusRing}`}
            >
              Undo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// -my-2.5 keeps the 48px tap target without adding that height to the notice.
const actionLink = '-my-2.5 inline-flex min-h-12 min-w-12 items-center text-sm font-bold text-navy underline underline-offset-4'

const NOTICE_TONES = {
  card: 'border-ivory-line bg-ivory-surface text-ink',
  offline: 'border-terracotta bg-terracotta-soft text-terracotta-ink',
  error: 'border-danger-line bg-danger-soft text-danger',
}

/** The Figma StateNotice: a 20px-radius card with a bold title and a caption, for empty, offline and error states. */
function Notice({
  title,
  children,
  tone = 'card',
  role,
  action,
}: {
  title: string
  children?: ReactNode
  tone?: keyof typeof NOTICE_TONES
  role?: 'status' | 'alert'
  action?: ReactNode
}) {
  return (
    <div role={role} className={`flex flex-col items-start gap-1.5 rounded-[20px] border px-4.5 py-4 ${NOTICE_TONES[tone]}`}>
      <p className="text-[0.9375rem] leading-[1.375rem] font-bold">{title}</p>
      {children && <p className="text-xs font-medium text-ink-body">{children}</p>}
      {action}
    </div>
  )
}

function BookmarksSection({ bookmarks, onRemove }: { bookmarks: Bookmark[]; onRemove: (bookmark: Bookmark) => void }) {
  return (
    <section aria-label="Bookmarked landmarks" className="flex flex-col gap-4">
      {bookmarks.length === 0 ? (
        <Notice title="No saved places yet">Tap the bookmark on any landmark to save it here for offline access.</Notice>
      ) : (
        <>
          <h2 className="flex items-start gap-2 text-lg leading-6 font-bold">
            <BookmarkIcon size={18} className="mt-[3px] shrink-0 text-terracotta" />
            Bookmarked Landmarks ({bookmarks.length} {bookmarks.length === 1 ? 'place' : 'places'})
          </h2>
          {bookmarks.map((bookmark) => (
            <PlaceCard key={bookmark.id} bookmark={bookmark} onRemove={() => onRemove(bookmark)} />
          ))}
        </>
      )}
    </section>
  )
}

function PlaceCard({ bookmark, onRemove }: { bookmark: Bookmark; onRemove: () => void }) {
  const distance = formatDistance(bookmark.distanceMeters)
  return (
    <article className="relative overflow-hidden rounded-3xl border border-ivory-line bg-ivory-surface">
      <div className="relative h-36 bg-sage-soft">
        {bookmark.imageUrl ? (
          <img src={bookmark.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <div className="flex size-full items-center justify-center text-sage-deep">
            <CompassOutlineIcon size={40} />
          </div>
        )}
        <span className="absolute top-3 left-3 rounded-full bg-terracotta-soft px-2.5 py-1 text-[0.625rem] leading-[0.875rem] font-bold tracking-wide text-terracotta-ink">
          {CATEGORY_LABELS[bookmark.category] ?? bookmark.category}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${bookmark.name} from bookmarks`}
          aria-pressed="true"
          className={`absolute top-1 right-1 z-10 flex size-12 items-center justify-center rounded-full ${focusRing}`}
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-terracotta text-on-navy shadow-navy">
            <BookmarkIcon size={18} />
          </span>
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          {/* The ::after box makes the whole card open the landmark; the remove button sits above it. */}
          <Link
            to={`/landmarks/${bookmark.id}`}
            className={`line-clamp-2 rounded-md font-display text-xl leading-[1.625rem] font-bold tracking-[-0.005em] after:absolute after:inset-0 ${focusRing}`}
          >
            {bookmark.name}
          </Link>
          <p className="flex items-center gap-1 text-xs font-medium text-ink-muted">
            <LocationIcon size={12} className="shrink-0 text-terracotta-ink" />
            <span className="truncate">
              {bookmark.district}
              {distance && ` · ${distance}`}
            </span>
          </p>
        </div>
        <p className="flex shrink-0 items-center gap-1 rounded-[10px] bg-navy-soft px-2.5 py-[5px] font-mono text-[0.6875rem] leading-[0.875rem] font-bold tracking-[0.02em] text-terracotta-ink">
          <StarIcon size={12} className="text-terracotta" />
          <span className="sr-only">Rating </span>
          {bookmark.rating.toFixed(1)}
        </p>
      </div>
    </article>
  )
}

function HistoryList({ visits, landmarkById }: { visits: Visit[]; landmarkById: Map<string, LandmarkSummary> }) {
  const groups = useMemo(() => groupByDay(visits), [visits])
  return groups.map(([label, items]) => (
    <div key={label} className="flex flex-col gap-4">
      <h2 className={eyebrow}>Visit history · {label}</h2>
      <ul className="flex flex-col gap-4">
        {items.map((visit) => (
          <HistoryRow key={visit.id} visit={visit} landmark={landmarkById.get(visit.landmarkId)} />
        ))}
      </ul>
    </div>
  ))
}

function HistoryRow({ visit, landmark }: { visit: Visit; landmark?: LandmarkSummary }) {
  const time = new Date(visit.createdAt).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
  return (
    <li>
      <Link
        to={`/landmarks/${visit.landmarkId}`}
        className={`flex items-center gap-3 rounded-2xl border border-ivory-line bg-ivory-surface p-3 ${focusRing}`}
      >
        <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-sage-soft text-sage-deep">
          {landmark?.imageUrl ? (
            <img src={landmark.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <LocationOutlineIcon size={20} />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <span className="text-[0.9375rem] leading-[1.375rem] font-bold">
            {landmark?.name ?? visit.landmarkId}
            {visit.xpAwarded > 0 && <span className="ml-2 whitespace-nowrap">+{visit.xpAwarded} XP</span>}
          </span>
          <span className="text-xs font-medium text-ink-muted">
            {time} · {landmark?.district ?? 'Cebu'}
          </span>
          <ActivityPill source={visit.source} />
        </span>
      </Link>
    </li>
  )
}

/** The Figma StatusPill. Scanned / Visited / Viewed differ by label, not colour alone (WCAG 1.4.1). */
function ActivityPill({ source }: { source: Visit['source'] }) {
  const [label, tone] =
    source === 'scan'
      ? ['Scanned', 'bg-navy-soft text-navy']
      : source === 'manual'
        ? ['Visited', 'bg-sage-soft text-sage-deep']
        : ['Viewed', 'bg-terracotta-soft text-terracotta-ink']
  return <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${tone}`}>{label}</span>
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
