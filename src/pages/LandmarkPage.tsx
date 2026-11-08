import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ApiError } from '@/api/client'
import { useCheckIn, useLandmark } from '@/api/hooks'
import {
  BookmarkIcon,
  BookmarkOutlineIcon,
  CameraOutlineIcon,
  ChatbubbleEllipsesIcon,
  CheckmarkIcon,
  LocationOutlineIcon,
  PauseIcon,
  SparklesIcon,
  StarIcon,
  VolumeHighOutlineIcon,
} from '@/components/icons/ionicons'
import { LandmarkImage } from '@/components/LandmarkCard'
import { focus, TopNavbar } from '@/components/TopNavbar'
import { useAuth } from '@/features/auth/AuthContext'
import { useBookmarks } from '@/features/bookmarks/useBookmarks'
import { useSpeech } from '@/hooks/useSpeech'
import { formatFee } from '@/lib/format'

/** Set by ScanPage when it navigates here after a match. */
export type ScanMatchState = { confidence: number }

const NO_STORY = { about: '', significance: '', architecture: '', trivia: '' }
const button = `flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold ${focus}`
const secondary = `${button} border border-line-strong bg-ivory-surface text-ink`

/** Figma "Scan-to-Story Page - Landmark Details" (268:8180). */
export default function LandmarkPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  // Read once, then cleared from history so back/forward doesn't show an old scan result again.
  const [match] = useState(() => location.state as ScanMatchState | null)
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate])
  const { bookmarks, isSaved, toggle } = useBookmarks()
  const auth = useAuth()
  const checkIn = useCheckIn()
  const query = useLandmark(id)

  // Offline fallback: read the saved copy when the network request fails (SRS 3.6.3.2).
  const landmark = query.data ?? bookmarks.find((b) => b.id === id)
  const story = landmark?.story ?? NO_STORY
  const speech = useSpeech([story.about, story.significance, story.architecture, story.trivia].join(' '))

  const saved = landmark ? isSaved(landmark.id) : false
  const bookmark = landmark && (
    <button
      type="button"
      onClick={() => toggle(landmark)}
      aria-pressed={saved}
      aria-label={saved ? 'Remove bookmark' : 'Save for offline reading'}
      className={`touch-target flex items-center justify-center rounded-full ${saved ? 'text-terracotta' : 'text-navy'} ${focus}`}
    >
      {saved ? <BookmarkIcon /> : <BookmarkOutlineIcon />}
    </button>
  )

  if (!landmark) {
    const notFound = query.error instanceof ApiError && query.error.status === 404
    return (
      <div className="min-h-dvh bg-ivory">
        <TopNavbar title="Landmark Details" />
        {query.isPending ? (
          <Skeleton />
        ) : (
          <div role="alert" className="m-6 flex flex-col gap-3 rounded-2xl border border-ivory-line bg-ivory-surface p-5">
            <p className="text-lg font-bold text-ink">{notFound ? "We couldn't find this landmark" : "Couldn't load this landmark"}</p>
            <p className="text-sm text-ink-body">
              {notFound
                ? 'It may have been removed. Browse the other heritage sites instead.'
                : 'Check your connection and try again. Landmarks you bookmark are available offline.'}
            </p>
            {notFound ? (
              <Link to="/" className={`${button} bg-navy text-on-navy`}>
                Explore landmarks
              </Link>
            ) : (
              <button type="button" onClick={() => query.refetch()} className={secondary}>
                Try again
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-ivory">
      <TopNavbar title="Landmark Details" action={bookmark} />
      <article>
        {/* Pinned to the light palette: ivory text on a navy scrim reads on any photo in either theme. */}
        <div data-theme="light" className="relative -mt-10 h-[22rem] overflow-hidden bg-sage-soft">
          <LandmarkImage src={landmark.imageUrl} alt={`Photo of ${landmark.name}`} className="absolute inset-0 size-full" />
          <div className="absolute inset-0 bg-linear-to-b from-navy/50 via-transparent via-35% to-navy/95" aria-hidden />
          <div className="absolute inset-x-6 bottom-8 flex flex-col items-start">
            {match && (
              <p className="flex items-center gap-1.5 rounded-full bg-sage-deep/90 px-3 py-1.5 text-xs font-bold tracking-[0.08em] text-ivory uppercase backdrop-blur-sm">
                <CheckmarkIcon size={14} />
                Landmark matched · {Math.round(match.confidence * 100)}%
              </p>
            )}
            <h1 className="pt-3 text-4xl font-extrabold tracking-tight text-ivory">{landmark.name}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-base text-ivory">
              <p className="flex items-center gap-1.5">
                <LocationOutlineIcon size={16} />
                {landmark.district}
              </p>
              <p className="flex items-center gap-1 rounded-full bg-ivory-surface px-2.5 py-0.5 text-sm font-bold text-ink">
                <StarIcon size={14} className="text-terracotta" />
                <span aria-hidden>{landmark.rating.toFixed(1)}</span>
                <span className="sr-only">Rated {landmark.rating.toFixed(1)} out of 5</span>
              </p>
            </div>
          </div>
        </div>

        <div className="relative -mt-5 flex flex-col gap-8 rounded-t-3xl bg-ivory px-6 pt-8 pb-10">
          <Section eyebrow={match ? 'Scan to story' : 'Overview'} title="About">
            <Text value={story.about} className="text-lg leading-7 text-ink" />
            <dl className="mt-4 grid grid-cols-3 gap-2">
              <Fact value={`${landmark.estimatedVisitMinutes} min`} label="Typical visit" />
              <Fact value={formatFee(landmark.admissionFee)} label="Admission" />
              <Fact value={landmark.visitCount.toLocaleString()} label="Visits" />
            </dl>
            <p className="mt-3 text-sm text-ink-muted">
              <span className="font-bold text-ink">Open</span> {landmark.visitingHours}
            </p>
            <div className="mt-4 flex gap-3">
              <Link to={`/landmarks/${landmark.id}/chat`} className={`${secondary} flex-1`}>
                <ChatbubbleEllipsesIcon size={20} className="shrink-0 text-terracotta" /> Ask bAI, your guide
              </Link>
              {speech.supported && (
                <button
                  type="button"
                  onClick={speech.state === 'playing' ? speech.pause : speech.play}
                  aria-label={speech.state === 'playing' ? 'Pause narration' : 'Listen to the story'}
                  className={`touch-target flex items-center justify-center rounded-xl bg-sage-soft text-sage-deep ${focus}`}
                >
                  {speech.state === 'playing' ? <PauseIcon size={20} /> : <VolumeHighOutlineIcon size={20} />}
                </button>
              )}
            </div>
          </Section>

          <Section eyebrow="Why it matters" title="Significance">
            <Text value={story.significance} />
          </Section>

          <Section eyebrow="Through the years" title="History">
            {/* shortcut: one undated entry until the API returns dated history events; then map them here. */}
            <ol className="border-l-2 border-sage pl-5">
              <li className="relative">
                <span className="absolute top-1.5 -left-[1.6rem] size-3 rounded-full border-2 border-ivory bg-terracotta" aria-hidden />
                <Text value={story.architecture} />
              </li>
            </ol>
          </Section>

          <section aria-labelledby="trivia-title" className="rounded-3xl border-2 border-dashed border-terracotta/40 bg-terracotta-soft p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 -rotate-6 items-center justify-center rounded-2xl bg-terracotta text-ivory-surface" aria-hidden>
                <SparklesIcon size={22} />
              </span>
              <div>
                <p className="text-xs font-bold tracking-[0.1em] text-terracotta-ink uppercase">Did you know?</p>
                <h2 id="trivia-title" className="text-xl font-bold text-ink">
                  Trivia
                </h2>
              </div>
            </div>
            <Text value={story.trivia} className="mt-3 text-lg leading-7 text-ink italic" />
          </section>

          <Section eyebrow="Shop local" title="Nearby Stores">
            {/* shortcut: empty until the API returns stores; split them into Affiliated partners and Popular nearby. */}
            <p className="rounded-2xl border border-ivory-line bg-ivory-surface p-4 text-sm text-ink-body">
              No stores are listed near {landmark.name} yet. Partner shops and local favourites will appear here.
            </p>
          </Section>

          <div className="flex flex-col gap-3">
            {/* A matched scan already records the visit, so check-in is only for landmarks opened by hand. */}
            {auth.status === 'signed-in' && !match && (
              <>
                <button type="button" onClick={() => checkIn.mutate(landmark.id)} disabled={checkIn.isPending || checkIn.isSuccess} className={`${secondary} disabled:opacity-80`}>
                  {checkIn.isSuccess ? 'Checked in' : "I'm here, check me in"}
                </button>
                {checkIn.isError && (
                  <p role="alert" className="text-sm text-danger">
                    Couldn't check you in. {checkIn.error.message}
                  </p>
                )}
              </>
            )}
            <Link to="/scan" className={`${button} min-h-13 bg-navy text-on-navy shadow-navy active:bg-navy-pressed`}>
              <CameraOutlineIcon size={19} /> Scan another landmark
            </Link>
          </div>
        </div>
      </article>
    </div>
  )
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  const id = `${title.toLowerCase().replace(/\s+/g, '-')}-title`
  return (
    <section aria-labelledby={id} className="border-t border-ivory-line pt-6 first:border-0 first:pt-0">
      <p className="text-xs font-bold tracking-[0.1em] text-terracotta-ink uppercase">{eyebrow}</p>
      <h2 id={id} className="pb-3 text-xl font-bold text-ink">
        {title}
      </h2>
      {children}
    </section>
  )
}

/** Story text capped near 70 characters a line, with a note when that part isn't written yet. */
function Text({ value, className = 'text-base leading-7 text-ink-body' }: { value: string; className?: string }) {
  return value.trim() ? (
    <p className={`max-w-[65ch] ${className}`}>{value}</p>
  ) : (
    <p className="text-sm text-ink-muted italic">This part of the story hasn't been written yet.</p>
  )
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col-reverse items-center gap-1.5 rounded-xl bg-sage-soft px-2 py-4 text-center">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="text-lg leading-6 font-bold text-ink">{value}</dd>
    </div>
  )
}

function Skeleton() {
  return (
    <div role="status" className="animate-pulse">
      <span className="sr-only">Loading landmark</span>
      <div className="-mt-10 h-[22rem] bg-sage-soft" aria-hidden />
      <div className="-mt-5 flex flex-col gap-3 rounded-t-3xl bg-ivory px-6 pt-8" aria-hidden>
        <div className="h-4 w-24 rounded bg-ivory-line" />
        <div className="h-6 w-40 rounded bg-ivory-line" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-4 rounded bg-ivory-line" />
        ))}
      </div>
    </div>
  )
}
