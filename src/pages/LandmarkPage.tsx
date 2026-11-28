import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ApiError } from '@/api/client'
import { useCheckIn, useLandmark } from '@/api/hooks'
import {
  ArrowBackIcon,
  BookmarkIcon,
  BookmarkOutlineIcon,
  CameraIcon,
  ChatbubbleIcon,
  CheckmarkIcon,
  ChevronDownOutlineIcon,
  LocationIcon,
  PauseIcon,
  ShareSocialOutlineIcon,
  StarIcon,
  VolumeHighOutlineIcon,
} from '@/components/icons/ionicons'
import { LandmarkImage } from '@/components/LandmarkCard'
import { focus, TopNavbar } from '@/components/TopNavbar'
import { useBack } from '@/hooks/useBack'
import { useAuth } from '@/features/auth/AuthContext'
import { useBookmarks } from '@/features/bookmarks/useBookmarks'
import { useSpeech } from '@/hooks/useSpeech'
import { useT } from '@/i18n'
import { errorText } from '@/i18n/errors'
import { formatFee } from '@/lib/format'

/** Set by ScanPage when it navigates here after a match. */
export type ScanMatchState = { confidence: number }

const NO_STORY = { about: '', significance: '', architecture: '', trivia: '' }
const disc = `flex size-12 items-center justify-center rounded-full ${focus}`
const quietDisc = `${disc} bg-ivory-surface/94 text-navy`
const pill = `flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-ivory-line text-[0.9375rem] leading-[1.375rem] font-bold text-ink ${focus}`
const cardTitle = 'font-display text-xl leading-[1.625rem] font-bold tracking-[-0.005em] text-ink'
const micro = 'text-[0.6875rem] leading-[0.875rem] font-bold tracking-[0.02em]'

/** Figma "09 · Landmark Details" (558:3330 light, 558:3421 dark; errors 558:3380). */
export default function LandmarkPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const back = useBack()
  const t = useT()
  const l = t.landmark
  // Read once, then cleared from history so back/forward doesn't show an old scan result again.
  const [match] = useState(() => location.state as ScanMatchState | null)
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate])
  const { bookmarks, isSaved, toggle } = useBookmarks()
  const auth = useAuth()
  const checkIn = useCheckIn()
  const query = useLandmark(id)
  const [copied, setCopied] = useState(false)

  // Offline fallback: read the saved copy when the network request fails (SRS 3.6.3.2).
  const landmark = query.data ?? bookmarks.find((b) => b.id === id)
  const story = landmark?.story ?? NO_STORY
  const speech = useSpeech([story.about, story.significance, story.architecture, story.trivia].join(' '))

  if (!landmark) {
    const notFound = query.error instanceof ApiError && query.error.status === 404
    return (
      <div className="min-h-dvh bg-ivory">
        <TopNavbar title={l.details} />
        {query.isPending ? (
          <Skeleton />
        ) : notFound ? (
          <Notice title={l.notFound} body={l.notFoundBody}>
            <Link to="/" className={`flex min-h-12 items-center self-start text-sm font-bold text-terracotta-ink underline ${focus}`}>
              {l.exploreLandmarks}
            </Link>
          </Notice>
        ) : (
          <Notice alert title={l.loadFailed} body={l.loadFailedBody}>
            <button type="button" onClick={() => query.refetch()} className={`flex min-h-12 items-center self-start text-sm font-bold underline ${focus}`}>
              {t.common.tryAgain}
            </button>
          </Notice>
        )}
      </div>
    )
  }

  const saved = isSaved(landmark.id)
  const fee = formatFee(landmark.admissionFee, t.common.free)
  const share = async () => {
    const url = window.location.href
    if (navigator.share) return navigator.share({ title: landmark.name, url }).catch(() => undefined)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // No clipboard (insecure context) or access denied: keep the Share label rather than claim a copy.
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      <article className="flex flex-1 flex-col">
        <div className="relative h-80 shrink-0 overflow-hidden bg-sage-soft">
          <LandmarkImage src={landmark.imageUrl} alt={l.photoOf(landmark.name)} className="absolute inset-0 size-full" />
          <div className="absolute inset-x-5 top-[max(1rem,env(safe-area-inset-top))] flex items-center justify-between">
            <button type="button" onClick={back} aria-label={t.common.goBack} className={quietDisc}>
              <ArrowBackIcon size={18} />
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={share} aria-label={copied ? l.linkCopied : l.share(landmark.name)} className={quietDisc}>
                {copied ? <CheckmarkIcon size={18} /> : <ShareSocialOutlineIcon size={18} />}
              </button>
              {/* Saved is a filled icon on coral, not only a colour change. */}
              <button
                type="button"
                onClick={() => toggle(landmark)}
                aria-pressed={saved}
                aria-label={saved ? l.removeBookmark : l.saveOffline}
                className={saved ? `${disc} bg-terracotta text-on-navy` : quietDisc}
              >
                {saved ? <BookmarkIcon size={18} /> : <BookmarkOutlineIcon size={18} />}
              </button>
            </div>
          </div>
          {/* shortcut: the API returns one photo, so this always reads 1/1; count the gallery once it returns more. */}
          {landmark.imageUrl && (
            <p className={`absolute right-5 bottom-[2.625rem] rounded-full bg-navy/85 px-2.5 py-1 font-mono text-on-navy ${micro}`}>
              <span className="sr-only">{l.photo}</span>1/1
            </p>
          )}
        </div>

        <div className="relative -mt-[1.875rem] flex flex-1 flex-col gap-4 rounded-t-[2rem] bg-ivory-surface px-6 pt-[1.625rem] pb-6">
          {match && (
            <p className={`self-start rounded-full bg-sage-soft px-3 py-1 font-mono text-sage-deep ${micro}`}>
              {l.matched(Math.round(match.confidence * 100))}
            </p>
          )}
          <h1 className="font-display text-3xl font-bold tracking-[-0.01em] text-ink">{landmark.name}</h1>
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs font-medium text-ink-muted">
            <StarIcon size={14} className="text-terracotta" />
            <span aria-hidden>
              {landmark.rating.toFixed(1)} ({landmark.visitCount.toLocaleString()})
            </span>
            <span className="sr-only">{l.ratedOutOf(landmark.rating.toFixed(1))}</span>
            <span aria-hidden>·</span>
            <span>{l.open(landmark.visitingHours)}</span>
          </p>
          <p className="flex items-center gap-2 rounded-xl bg-sage-soft px-3.5 py-2.5 text-sm text-sage-deep">
            <LocationIcon size={16} className="shrink-0 text-terracotta-ink" />
            {landmark.district}
          </p>

          <section aria-labelledby="about-title" className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 id="about-title" className={cardTitle}>
                {l.about}
              </h2>
              {speech.supported && (
                <button
                  type="button"
                  onClick={speech.state === 'playing' ? speech.pause : speech.play}
                  className={`-my-[0.6875rem] flex min-h-12 items-center gap-1.5 rounded-full px-2 text-xs font-bold text-sage-deep ${focus}`}
                >
                  {speech.state === 'playing' ? <PauseIcon size={16} /> : <VolumeHighOutlineIcon size={16} />}
                  {speech.state === 'playing' ? l.pause : l.listen}
                  <span className="sr-only">{l.toStory}</span>
                </button>
              )}
            </div>
            <Text value={story.about} className="text-sm text-ink-body" />
            <dl className="grid grid-cols-3 gap-2">
              <Fact value={t.common.minutes(landmark.estimatedVisitMinutes)} label={l.typicalVisit} />
              <Fact value={fee} label={l.admission} />
              <Fact value={landmark.visitCount.toLocaleString()} label={l.visits} />
            </dl>
            <Link to={`/landmarks/${landmark.id}/chat`} className={`${pill} bg-ivory-surface`}>
              <ChatbubbleIcon size={16} /> {l.askGuide}
            </Link>
          </section>

          <details open className="group">
            <summary className={`-my-[0.6875rem] flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-lg [&::-webkit-details-marker]:hidden ${focus}`}>
              <h2 className={cardTitle}>{l.significance}</h2>
              <ChevronDownOutlineIcon size={20} className="shrink-0 text-ink-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <div className="mt-4 flex flex-col gap-3">
              <Story value={story.significance} />
              <Story value={story.architecture} />
            </div>
          </details>

          <section aria-labelledby="trivia-title" className="flex flex-col gap-1 rounded-2xl border border-terracotta bg-terracotta-soft px-4 py-3.5">
            <h2 id="trivia-title" className="text-xs font-bold tracking-[0.1em] text-terracotta-ink uppercase">
              {l.trivia}
            </h2>
            <Text value={story.trivia} className="text-xs font-medium text-ink" />
          </section>

          {/* A matched scan already records the visit, so check-in is only for landmarks opened by hand. */}
          {auth.status === 'signed-in' && !match && (
            <>
              <button
                type="button"
                onClick={() => checkIn.mutate(landmark.id)}
                disabled={checkIn.isPending || checkIn.isSuccess}
                className={`${pill} bg-ivory-deep disabled:opacity-80`}
              >
                {checkIn.isSuccess && <CheckmarkIcon size={18} className="text-sage-deep" />}
                {checkIn.isSuccess ? l.checkedIn : l.checkIn}
              </button>
              {checkIn.isError && (
                <p role="alert" className="text-sm text-danger">
                  {l.checkInFailed(errorText(checkIn.error, t))}
                </p>
              )}
            </>
          )}
        </div>
      </article>

      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-ivory-line bg-ivory-surface px-4 pt-3.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] min-[375px]:px-6">
        <p className="flex shrink-0 flex-col gap-0.5 font-mono font-bold whitespace-nowrap">
          <span className="text-xs text-ink">{l.entry(fee)}</span>
          <span className={`text-ink-muted ${micro}`}>{l.visitLength(landmark.estimatedVisitMinutes)}</span>
        </p>
        {/* Coral text buttons use terracotta-ink: on-navy on brand coral is only 3.1:1. With large text the label wraps. */}
        <Link to="/scan" className={`flex min-h-12 min-w-0 items-center gap-1.5 rounded-full bg-terracotta-ink px-[1.125rem] py-1 text-xs font-bold text-on-navy ${focus}`}>
          <CameraIcon size={16} className="shrink-0" /> {l.scanAnother}
        </Link>
      </div>
    </div>
  )
}

/** Figma Laag ta bAI/StateNotice: quiet card for not found, danger tones for errors. */
function Notice({ title, body, alert, children }: { title: string; body: string; alert?: boolean; children: ReactNode }) {
  return (
    <div
      role="alert"
      className={`mx-6 mt-8 flex flex-col gap-1.5 rounded-[1.25rem] border px-[1.125rem] py-4 ${
        alert ? 'border-danger-line bg-danger-soft text-danger' : 'border-ivory-line bg-ivory-surface text-ink'
      }`}
    >
      <p className="text-[0.9375rem] leading-[1.375rem] font-bold">{title}</p>
      <p className={`text-xs font-medium ${alert ? '' : 'text-ink-body'}`}>{body}</p>
      {children}
    </div>
  )
}

/** Story text capped near 70 characters a line, with a note when that part isn't written yet. */
function Text({ value, className }: { value: string; className: string }) {
  const t = useT()
  return value.trim() ? (
    <p className={`max-w-[65ch] ${className}`}>{value}</p>
  ) : (
    <p className="text-sm text-ink-muted italic">{t.landmark.notWritten}</p>
  )
}

function Story({ value }: { value: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-[3px] shrink-0 rounded-full bg-navy" aria-hidden />
      <Text value={value} className="text-xs font-medium text-ink-body" />
    </div>
  )
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col-reverse items-center gap-0.5 rounded-xl bg-ivory-deep py-2.5 text-center">
      <dt className={`text-ink-muted ${micro}`}>{label}</dt>
      <dd className="font-mono text-xs font-bold text-ink">{value}</dd>
    </div>
  )
}

function Skeleton() {
  const t = useT()
  return (
    <div role="status" className="animate-pulse">
      <span className="sr-only">{t.landmark.loading}</span>
      <div className="-mt-10 h-80 bg-sage-soft" aria-hidden />
      <div className="-mt-[1.875rem] flex flex-col gap-3 rounded-t-[2rem] bg-ivory-surface px-6 pt-[1.625rem]" aria-hidden>
        <div className="h-5 w-40 rounded-full bg-ivory-line" />
        <div className="h-8 w-56 rounded bg-ivory-line" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-4 rounded bg-ivory-line" />
        ))}
      </div>
    </div>
  )
}
