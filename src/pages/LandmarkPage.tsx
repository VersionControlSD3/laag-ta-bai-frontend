import type { ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { useCheckIn, useLandmark } from '@/api/hooks'
import type { Landmark } from '@/api/types'
import { LandmarkImage } from '@/components/LandmarkCard'
import { ErrorMessage } from '@/components/StateMessage'
import { TopNavbar } from '@/components/TopNavbar'
import {
  BulbOutlineIcon,
  CameraOutlineIcon,
  ChatbubbleEllipsesOutlineIcon,
  CheckmarkCircleIcon,
  HeartIcon,
  HeartOutlineIcon,
  LocationOutlineIcon,
  PauseIcon,
  StarIcon,
  VolumeHighOutlineIcon,
} from '@/components/icons/ionicons'
import { useAuth } from '@/features/auth/AuthContext'
import { useBookmarks } from '@/features/bookmarks/useBookmarks'
import { FOLLOW_UPS } from '@/features/chat/followUps'
import { useSpeech } from '@/hooks/useSpeech'
import { formatFee } from '@/lib/format'
import type { ScanMatchState } from './ScanPage'

/** Landmark Details, from Figma Final Pages "Scan-to-Story Page - Landmark Details". */
export default function LandmarkPage() {
  const { id } = useParams()
  const location = useLocation()
  const { bookmarks, isSaved, toggle } = useBookmarks()
  const query = useLandmark(id)

  // Offline fallback: read the saved copy when the network request fails (SRS 3.6.3.2).
  const landmark = query.data ?? bookmarks.find((b) => b.id === id)
  const match = (location.state as ScanMatchState | null)?.match

  if (query.isPending && !landmark) return <LandmarkSkeleton />
  if (!landmark) {
    return (
      <div className="mx-auto min-h-dvh max-w-md bg-ivory">
        <TopNavbar title="Landmark Details" />
        <ErrorMessage error={query.error} onRetry={() => query.refetch()} />
      </div>
    )
  }

  const saved = isSaved(landmark.id)
  return (
    <article className="mx-auto min-h-dvh max-w-md bg-ivory text-ink">
      <TopNavbar
        title="Landmark Details"
        titleAs="p"
        className="sticky top-0"
        action={
          <button
            type="button"
            onClick={() => toggle(landmark)}
            aria-pressed={saved}
            aria-label={saved ? 'Remove bookmark' : 'Save for offline reading'}
            className="flex size-12 items-center justify-center rounded-full text-navy focus-visible:outline-2 focus-visible:outline-navy"
          >
            {saved ? <HeartIcon /> : <HeartOutlineIcon />}
          </button>
        }
      />
      <Hero landmark={landmark} confidence={match?.confidence} />
      <Story landmark={landmark} />
    </article>
  )
}

function Hero({ landmark, confidence }: { landmark: Landmark; confidence?: number }) {
  return (
    // Text sits on a photo in both themes, so the hero keeps the light token values.
    <div data-theme="light" className="relative -mt-[calc(var(--spacing-topbar)+env(safe-area-inset-top))] h-[390px] bg-navy-pressed text-ivory">
      <LandmarkImage src={landmark.imageUrl} alt={landmark.name} className="absolute inset-0 size-full" />
      <div className="absolute inset-0 bg-linear-to-b from-navy/50 via-navy/0 via-36% to-navy/95" aria-hidden />
      <div className="absolute inset-x-6 bottom-10 flex flex-col gap-2">
        {confidence !== undefined && (
          <p className="flex w-fit items-center gap-1.5 rounded-full bg-sage-deep/90 px-2.5 py-1.5 text-[0.625rem] leading-[0.875rem] font-bold tracking-wide uppercase shadow-lg">
            <CheckmarkCircleIcon size={14} /> Landmark matched · {Math.round(confidence * 100)}%
          </p>
        )}
        <h1 className="text-4xl font-extrabold tracking-tight">{landmark.name}</h1>
        <p className="flex items-center gap-1.5 text-ivory/90">
          <LocationOutlineIcon size={16} /> {landmark.district}
        </p>
      </div>
    </div>
  )
}

function Story({ landmark }: { landmark: Landmark }) {
  const auth = useAuth()
  const checkIn = useCheckIn()
  const { story } = landmark
  const speech = useSpeech([story.about, story.significance, story.architecture, story.trivia].join(' '))
  return (
    <div className="relative -mt-[18px] flex flex-col gap-8 rounded-t-3xl bg-ivory px-6 pt-8 pb-10">
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Eyebrow>Scan to story</Eyebrow>
          {speech.supported && (
            <button
              type="button"
              onClick={speech.state === 'playing' ? speech.pause : speech.play}
              aria-label={speech.state === 'playing' ? 'Pause narration' : 'Listen to the story'}
              className="flex min-h-12 items-center gap-2 rounded-full bg-sage-soft px-4 text-sm font-bold text-sage-deep focus-visible:outline-2 focus-visible:outline-navy"
            >
              {speech.state === 'playing' ? <PauseIcon size={18} /> : <VolumeHighOutlineIcon size={18} />}
              {speech.state === 'playing' ? 'Pause' : 'Listen'}
            </button>
          )}
        </div>
        <p className="text-lg text-ink">{story.about}</p>
      </section>

      <dl className="grid grid-cols-3 gap-2">
        <Fact value={landmark.rating.toFixed(1)} label="Visitor rating" icon={<StarIcon size={12} />} />
        <Fact value={formatFee(landmark.admissionFee)} label="Admission" />
        <Fact value={`${landmark.estimatedVisitMinutes} min`} label="Typical visit" />
      </dl>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Eyebrow>The story</Eyebrow>
          <h2 className="text-2xl font-bold">Why it matters</h2>
        </div>
        <p className="text-ink-body">{story.significance}</p>
        <h3 className="text-lg font-bold">Architecture</h3>
        <p className="text-ink-body">{story.architecture}</p>
        <p className="text-sm text-ink-muted">
          <span className="font-bold text-ink-body">Hours:</span> {landmark.visitingHours}
        </p>
      </section>

      <aside className="flex gap-4 rounded-xl border border-terracotta/25 bg-linear-to-br from-sage-soft via-terracotta-soft/60 to-terracotta-soft/30 p-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-terracotta text-ivory-surface" aria-hidden>
          <BulbOutlineIcon size={22} />
        </span>
        <p className="text-ink-body">
          <strong className="text-ink">Did you know?</strong> {story.trivia}
        </p>
      </aside>

      <FollowUps landmarkId={landmark.id} />

      <div className="flex flex-col gap-3">
        {auth.status === 'signed-in' && (
          <button
            type="button"
            onClick={() => checkIn.mutate(landmark.id)}
            disabled={checkIn.isPending || checkIn.isSuccess}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line-strong font-bold text-navy disabled:opacity-70"
          >
            <LocationOutlineIcon size={20} /> {checkIn.isSuccess ? 'Checked in' : "I'm here: check in"}
          </button>
        )}
        {checkIn.isError && <ErrorMessage error={checkIn.error} />}
        <Link to="/scan" className="flex min-h-13 items-center justify-center gap-2 rounded-xl bg-navy text-sm font-bold text-on-navy shadow-navy active:bg-navy-pressed">
          <CameraOutlineIcon size={20} /> Scan another landmark
        </Link>
      </div>
    </div>
  )
}

/** Entry to the AI guide (SRS 3.1.2) with ready-made follow-up questions. */
function FollowUps({ landmarkId }: { landmarkId: string }) {
  const chat = `/landmarks/${landmarkId}/chat`
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-ivory-line bg-ivory-surface p-4" aria-labelledby="follow-up-title">
      <div className="flex items-center gap-3">
        <img src="/brand/logo-icon.png" alt="" className="size-10 rounded-full bg-sage-soft object-contain p-1.5" />
        <div>
          <h2 id="follow-up-title" className="font-bold text-ink">
            Have a follow-up question?
          </h2>
          <p className="text-sm text-ink-muted">Ask bAI, your Cebu guide.</p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-2">
        {FOLLOW_UPS.map((question) => (
          <li key={question}>
            <Link
              to={chat}
              state={{ ask: question }}
              className="flex min-h-12 items-center rounded-full bg-sage-soft px-4 text-sm font-medium text-sage-deep focus-visible:outline-2 focus-visible:outline-navy"
            >
              {question}
            </Link>
          </li>
        ))}
      </ul>
      <Link to={chat} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-navy font-bold text-navy">
        <ChatbubbleEllipsesOutlineIcon size={20} /> Ask bAI
      </Link>
    </section>
  )
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-bold tracking-[0.1em] text-terracotta-ink uppercase">{children}</p>
}

function Fact({ value, label, icon }: { value: string; label: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-sage-soft px-2 py-4 text-center">
      <dd className="text-lg font-bold text-ink">{value}</dd>
      <dt className="flex items-center justify-center gap-1 text-xs text-ink-muted">
        {icon && <span aria-hidden>{icon}</span>}
        {label}
      </dt>
    </div>
  )
}

/** Loading state that mirrors the page layout, so nothing jumps when the story arrives. */
function LandmarkSkeleton() {
  const bar = 'rounded-full bg-ivory-deep motion-safe:animate-pulse'
  return (
    <div className="mx-auto min-h-dvh max-w-md bg-ivory">
      <TopNavbar title="Landmark Details" titleAs="p" className="sticky top-0" />
      <div role="status" aria-label="Loading landmark" className="flex flex-col">
        <div className="-mt-[calc(var(--spacing-topbar)+env(safe-area-inset-top))] h-[390px] bg-ivory-deep motion-safe:animate-pulse" />
        <div className="relative -mt-[18px] flex flex-col gap-4 rounded-t-3xl bg-ivory px-6 pt-8">
          <div className={`h-3 w-28 ${bar}`} />
          <div className={`h-5 w-full ${bar}`} />
          <div className={`h-5 w-4/5 ${bar}`} />
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-ivory-deep motion-safe:animate-pulse" />
            ))}
          </div>
          <div className={`mt-4 h-4 w-full ${bar}`} />
          <div className={`h-4 w-11/12 ${bar}`} />
          <div className={`h-4 w-3/4 ${bar}`} />
        </div>
      </div>
    </div>
  )
}
