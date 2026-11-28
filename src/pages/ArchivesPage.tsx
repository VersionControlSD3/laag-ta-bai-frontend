import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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
  LocationIcon,
  LocationOutlineIcon,
  StarIcon,
  TimeOutlineIcon,
} from '@/components/icons/ionicons'
import { useAuth } from '@/features/auth/AuthContext'
import { useBookmarks, type Bookmark } from '@/features/bookmarks/useBookmarks'
import { CATEGORY_LABELS, formatDistance } from '@/lib/format'

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy'
const eyebrow = 'text-xs font-bold tracking-[0.1em] text-terracotta-ink uppercase'
const countPill = 'shrink-0 rounded-full border border-ivory-line bg-navy-soft px-2.5 py-1 text-xs font-bold text-ink-muted'
// whitespace-nowrap keeps each CTA label on one line; the buttons stack on narrow screens instead.
const primaryCta = `flex min-h-12 items-center justify-center gap-2 rounded-full bg-navy px-5 text-sm font-bold whitespace-nowrap text-on-navy transition-colors hover:bg-navy-pressed ${focusRing}`
const secondaryCta = `flex min-h-12 items-center justify-center gap-2 rounded-full border border-ivory-line bg-ivory-surface px-5 text-sm font-bold whitespace-nowrap text-ink transition-colors hover:bg-navy-soft ${focusRing}`

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

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

  const visits = me.data?.recentVisits ?? []
  const bothEmpty = auth.status === 'signed-in' && me.isSuccess && bookmarks.length === 0 && visits.length === 0

  let history: ReactNode
  if (auth.status === 'loading') history = <Loading label="Checking your account…" />
  else if (auth.status !== 'signed-in')
    history = <SignInPrompt message="Sign in to keep a history of the places you visit across Cebu." />
  else if (me.isPending) history = <Loading label="Loading your visit history…" />
  else if (me.isError) history = <ErrorMessage error={me.error} onRetry={() => me.refetch()} />
  else if (visits.length === 0) history = <EmptyHistoryView />
  else history = <HistoryList visits={visits} landmarkById={landmarkById} />

  return (
    <div className="bleed-under-nav flex min-h-dvh flex-col gap-6 bg-ivory px-6 pt-[max(3rem,env(safe-area-inset-top))] text-ink">
      {isOffline && <OfflineBanner />}

      <header className="flex flex-col gap-1">
        <p className={eyebrow}>Your collection</p>
        <h1 className="text-3xl font-extrabold tracking-[-0.02em]">Saved Places</h1>
        <p className="text-sm text-ink-body">Places and stories you saved for later.</p>
      </header>

      {bothEmpty ? (
        <EmptyBothView />
      ) : (
        <>
          <BookmarksSection bookmarks={bookmarks} onRemove={removeBookmark} />
          <hr className="border-t-2 border-ivory-line" />
          <section aria-labelledby="history-heading" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <SectionHeading id="history-heading" icon={<TimeOutlineIcon size={20} />} title="Visit History">
                {auth.status === 'signed-in' && visits.length > 0 && (
                  <span className={countPill}>{plural(visits.length, 'activity', 'activities')}</span>
                )}
              </SectionHeading>
              <p className="text-xs text-ink-muted">Your scans, visits and viewed stories, newest first.</p>
            </div>
            {history}
          </section>
        </>
      )}

      {/* Mounted up front so screen readers announce the toast when it appears. bottom-24 per ticket 06, plus the safe area. */}
      <div
        role="status"
        className="fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-[calc(28rem-2rem)]"
      >
        {removed && (
          <div className="flex items-center gap-2 rounded-2xl border border-on-navy/15 bg-navy py-1 pr-1 pl-4 text-on-navy shadow-navy">
            <p className="min-w-0 flex-1 truncate text-xs font-semibold">Removed "{removed.name}" from bookmarks</p>
            <button
              type="button"
              onClick={undoRemove}
              className={`flex min-h-12 min-w-12 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-terracotta-soft px-3 text-xs font-bold text-terracotta-ink ${focusRing} focus-visible:outline-on-navy`}
            >
              <ArrowUndoOutlineIcon size={16} />
              Undo
            </button>
            <button
              type="button"
              onClick={() => setRemoved(null)}
              aria-label="Dismiss"
              className={`flex size-12 shrink-0 items-center justify-center rounded-xl text-on-navy ${focusRing} focus-visible:outline-on-navy`}
            >
              <CloseOutlineIcon size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function OfflineBanner() {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-2xl border border-terracotta/30 bg-terracotta-soft p-3.5 text-terracotta-ink"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ivory-surface">
        <CloudOfflineOutlineIcon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">Offline mode active</p>
        <p className="text-xs text-ink-body">Showing bookmarked landmarks and cached visit history.</p>
      </div>
      <span className="shrink-0 rounded-full border border-terracotta/30 bg-ivory-surface px-2.5 py-1 text-xs font-bold tracking-wider uppercase">
        Cached
      </span>
    </div>
  )
}

function SectionHeading({ id, icon, title, children }: { id: string; icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="flex items-center gap-2 text-xl font-bold tracking-tight">
        <span className="shrink-0 text-terracotta">{icon}</span>
        {title}
      </h2>
      {children}
    </div>
  )
}

function BookmarksSection({ bookmarks, onRemove }: { bookmarks: Bookmark[]; onRemove: (bookmark: Bookmark) => void }) {
  return (
    <section aria-labelledby="bookmarks-heading" className="flex flex-col gap-4">
      <SectionHeading id="bookmarks-heading" icon={<BookmarkOutlineIcon size={20} />} title="Bookmarked Landmarks">
        <span className={countPill}>{plural(bookmarks.length, 'place', 'places')}</span>
      </SectionHeading>
      {bookmarks.length === 0 ? (
        <EmptyCard
          icon={<BookmarkOutlineIcon size={28} />}
          iconTone="bg-terracotta-soft text-terracotta-ink"
          title="No saved places yet"
          to="/"
          cta="Explore landmarks"
        >
          Tap the bookmark on any landmark to save it here for quick offline access and itinerary planning.
        </EmptyCard>
      ) : (
        bookmarks.map((bookmark) => (
          <PlaceCard key={bookmark.id} bookmark={bookmark} onRemove={() => onRemove(bookmark)} />
        ))
      )}
    </section>
  )
}

function PlaceCard({ bookmark, onRemove }: { bookmark: Bookmark; onRemove: () => void }) {
  const distance = formatDistance(bookmark.distanceMeters)
  return (
    <article className="relative overflow-hidden rounded-3xl border border-ivory-line bg-ivory-surface">
      <div className="relative h-44 bg-sage-soft">
        {bookmark.imageUrl ? (
          <img src={bookmark.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <div className="flex size-full items-center justify-center text-sage-deep">
            <CompassOutlineIcon size={40} />
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-navy/60 to-transparent" />
        <span className="absolute top-3 left-3 flex h-7 items-center rounded-full bg-terracotta-soft px-3 text-xs font-bold tracking-wide text-terracotta-ink">
          {CATEGORY_LABELS[bookmark.category] ?? bookmark.category}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${bookmark.name} from bookmarks`}
          aria-pressed="true"
          className={`absolute top-2 right-2 z-10 flex min-h-12 min-w-12 items-center justify-center rounded-full border border-on-navy/30 bg-navy/85 text-on-navy shadow-navy backdrop-blur-md transition-colors hover:bg-navy ${focusRing}`}
        >
          <BookmarkIcon size={20} />
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 flex-col gap-1">
          {/* The ::after box makes the whole card open the landmark; the remove button sits above it. */}
          <Link
            to={`/landmarks/${bookmark.id}`}
            className={`line-clamp-2 rounded-md text-lg leading-6 font-bold after:absolute after:inset-0 ${focusRing}`}
          >
            {bookmark.name}
          </Link>
          <p className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
            <LocationIcon size={14} className="shrink-0 text-terracotta-ink" />
            <span className="truncate">
              {bookmark.district}
              {distance && ` · ${distance}`}
            </span>
          </p>
        </div>
        <p className="flex shrink-0 items-center gap-1 rounded-xl border border-ivory-line bg-navy-soft px-2.5 py-1.5 text-xs font-bold text-terracotta-ink">
          <StarIcon size={14} className="text-terracotta" />
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
    <div key={label} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h3 className={eyebrow}>{label}</h3>
        <span className="h-px flex-1 bg-ivory-line" />
        <span className="text-xs font-semibold text-ink-muted">{plural(items.length, 'activity', 'activities')}</span>
      </div>
      <ul className="flex flex-col gap-2.5">
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
        className={`flex items-center gap-3 rounded-2xl border border-ivory-line bg-ivory-surface p-3 transition-colors hover:bg-navy-soft ${focusRing}`}
      >
        <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ivory-line bg-sage-soft text-sage-deep">
          {landmark?.imageUrl ? (
            <img src={landmark.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <LocationOutlineIcon size={20} />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <span className="flex max-w-full items-center gap-2">
            <span className="truncate text-sm font-bold">{landmark?.name ?? visit.landmarkId}</span>
            {visit.xpAwarded > 0 && (
              <span className="shrink-0 rounded-md bg-sage-soft px-1.5 py-0.5 text-xs font-bold text-sage-deep">
                +{visit.xpAwarded} XP
              </span>
            )}
          </span>
          <span className="flex max-w-full items-center gap-1.5 text-xs text-ink-muted">
            <span className="shrink-0">{time}</span>
            <span aria-hidden="true">•</span>
            <span className="truncate">{landmark?.district ?? 'Cebu'}</span>
          </span>
          <ActivityBadge source={visit.source} />
        </span>
      </Link>
    </li>
  )
}

/** Scanned / Visited / Viewed differ by icon and label, not colour alone (WCAG 1.4.1). */
function ActivityBadge({ source }: { source: Visit['source'] }) {
  const [label, Icon, tone] =
    source === 'scan'
      ? (['Scanned', CameraOutlineIcon, 'border-navy/25 bg-navy-soft text-navy'] as const)
      : source === 'manual'
        ? (['Visited', CheckmarkCircleOutlineIcon, 'border-sage-deep/35 bg-sage-soft text-sage-deep'] as const)
        : (['Viewed', EyeOutlineIcon, 'border-terracotta/35 bg-terracotta-soft text-terracotta-ink'] as const)
  return (
    <span className={`mt-1 inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-bold ${tone}`}>
      <Icon size={14} />
      <span>{label}</span>
    </span>
  )
}

function EmptyCard({
  icon,
  iconTone,
  title,
  to,
  cta,
  children,
}: {
  icon: ReactNode
  iconTone: string
  title: string
  to: string
  cta: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-ivory-line bg-ivory-surface p-8 text-center">
      <span className={`mb-3 flex size-14 items-center justify-center rounded-2xl ${iconTone}`}>{icon}</span>
      <h3 className="text-base font-bold">{title}</h3>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-ink-muted">{children}</p>
      <Link to={to} className={`mt-5 ${primaryCta}`}>
        {cta}
      </Link>
    </div>
  )
}

function EmptyHistoryView() {
  return (
    <EmptyCard
      icon={<TimeOutlineIcon size={28} />}
      iconTone="bg-sage-soft text-sage-deep"
      title="No activity history yet"
      to="/scan"
      cta="Scan a landmark"
    >
      Landmarks you scan with the camera, check into, or read about will appear here chronologically.
    </EmptyCard>
  )
}

function EmptyBothView() {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-ivory-line bg-ivory-surface px-6 py-10 text-center">
      <span className="mb-4 flex size-16 items-center justify-center rounded-3xl bg-terracotta-soft text-terracotta-ink">
        <BookOutlineIcon size={32} />
      </span>
      <h2 className="text-2xl font-extrabold">Your archives are empty</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-body">
        Start building your Cebu journey! Bookmark heritage sites to read offline and scan landmarks with your camera as
        you explore to grow your travel history.
      </p>
      {/* Stacked full-width on phones; side by side only when there is room for both labels. */}
      <div className="mt-6 flex w-full flex-col gap-3 min-[420px]:w-auto min-[420px]:flex-row">
        <Link to="/" className={primaryCta}>
          <CompassOutlineIcon size={18} />
          Explore landmarks
        </Link>
        <Link to="/scan" className={secondaryCta}>
          <CameraOutlineIcon size={18} />
          Scan landmarks
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
