import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { usePreferences } from '@/features/preferences/PreferencesContext'
import {
  ArrowForwardIcon,
  CameraOutlineIcon,
  CheckmarkIcon,
  LocationOutlineIcon,
  SparklesIcon,
  TrophyOutlineIcon,
} from '@/components/icons/ionicons'

const SLIDES = [
  {
    tag: 'Discover',
    tagClass: 'bg-terracotta-soft text-terracotta-ink',
    title: 'Every corner has a story.',
    body: 'Find heritage landmarks, local favorites, and hidden gems across Cebu—curated for curious travelers.',
    image: '/landmarks/heritage.jpg',
    imageClass: 'object-cover',
    card: { title: 'Nearby heritage', sub: 'Stories around you', Icon: LocationOutlineIcon, disc: 'bg-terracotta text-on-navy' },
  },
  {
    tag: 'Scan to story',
    tagClass: 'bg-navy-soft text-navy',
    title: 'Point. Scan. Step into history.',
    body: 'Use your camera at a landmark and let bAI reveal the people, moments, and legends that shaped it.',
    image: '/brand/NewLogo.png',
    imageClass: 'object-contain p-8 bg-sage-soft',
    card: { title: 'Landmark recognized', sub: 'Story ready to explore', Icon: CameraOutlineIcon, disc: 'bg-navy text-on-navy' },
  },
  {
    tag: 'Make it yours',
    tagClass: 'bg-sage-soft text-sage-deep',
    title: 'Learn more with every laag.',
    body: 'Complete cultural quests, collect heritage badges, and save every story you want to return to.',
    image: '/onboarding/bridge.webp',
    imageClass: 'object-cover',
    card: { title: 'Cebu Explorer', sub: 'Your first badge awaits', Icon: TrophyOutlineIcon, disc: 'bg-sage-deep text-on-navy' },
  },
] as const

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy'

/** First-run onboarding: three slides, then Permissions then Sign up (Start exploring), or Login (Skip). */
export default function OnboardingPage() {
  const prefs = usePreferences()
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const swipeX = useRef<number | null>(null)
  const slide = SLIDES[index]
  const last = index === SLIDES.length - 1

  // replace: back from Permissions or Login must not return to the slides.
  const finish = (completed: boolean) => {
    prefs.update({ onboarded: true })
    // First-run users have no account yet, so the full path ends on Sign up.
    if (completed) navigate('/permissions', { replace: true, state: { next: '/register' } })
    else navigate('/login', { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-linear-to-b from-ivory to-ivory-deep px-6">
      <header className="flex items-center justify-between pt-4">
        <p className="flex items-baseline gap-1.5" role="img" aria-label="Laag ta bAI">
          <span className="text-[0.625rem] font-bold tracking-[0.1em] text-ink uppercase">Laag ta</span>
          <span className="text-xl font-extrabold text-terracotta-ink">bAI</span>
        </p>
        <button
          type="button"
          onClick={() => finish(false)}
          aria-label="Skip onboarding"
          className={`touch-target rounded-full bg-ivory-surface px-4 text-sm font-bold text-ink-muted ${focusRing}`}
        >
          Skip
        </button>
      </header>

      <main
        className="flex flex-1 touch-pan-y flex-col select-none"
        onPointerDown={(e) => {
          swipeX.current = e.clientX
          // Capture so pointerup still arrives if the finger lifts outside <main>.
          e.currentTarget.setPointerCapture?.(e.pointerId)
        }}
        onPointerCancel={() => (swipeX.current = null)}
        onPointerUp={(e) => {
          if (swipeX.current === null) return
          const dx = e.clientX - swipeX.current
          swipeX.current = null
          // 50px threshold so taps and vertical scrolls don't change slides.
          if (dx < -50 && !last) setIndex(index + 1)
          if (dx > 50 && index > 0) setIndex(index - 1)
        }}
      >
        {/* Stays mounted so screen readers announce each slide change. */}
        <p role="status" className="sr-only">{`Page ${index + 1} of ${SLIDES.length}: ${slide.title}`}</p>
        {/* key restarts the fade on every slide; motion-reduce turns it off. */}
        <div key={index} className="flex flex-col animate-[fade-in_300ms_ease-out] motion-reduce:animate-none">
          <section className="relative mx-auto mt-8 w-full max-w-[320px]" aria-hidden="true">
            {/* Light palette pinned: the logo artwork is made for light grounds. */}
            <div data-palette="light" className="-rotate-2 rounded-2xl bg-ivory-surface p-2 shadow-navy">
              <img src={slide.image} alt="" draggable={false} className={`aspect-square w-full rounded-xl ${slide.imageClass}`} />
            </div>
            <span className="absolute -top-3 -right-2 flex size-10 items-center justify-center rounded-full bg-terracotta text-on-navy ring-4 ring-ivory-surface">
              <SparklesIcon size={20} />
            </span>
            {/* Opaque surface so the card stays readable over any part of the photo. */}
            <div className="absolute inset-x-[-8px] bottom-[-28px] flex items-center gap-3 rounded-xl bg-ivory-surface p-3 shadow-navy">
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${slide.card.disc}`}>
                <slide.card.Icon size={20} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-bold text-ink">{slide.card.title}</span>
                <span className="text-xs font-medium text-ink-muted">{slide.card.sub}</span>
              </span>
              <CheckmarkIcon size={18} className="text-sage-deep" />
            </div>
          </section>

          <div className="mt-14 flex flex-col items-center gap-3 text-center">
            <span className={`rounded-full px-3 py-1 text-xs font-bold tracking-[0.1em] uppercase ${slide.tagClass}`}>
              {slide.tag}
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight text-ink">{slide.title}</h1>
            <p className="text-sm leading-5 text-ink-body">{slide.body}</p>
          </div>
        </div>
      </main>

      <footer
        className="flex flex-wrap items-center justify-between gap-2 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
      >
        <div className="-ml-4 flex">
          {SLIDES.map((s, i) => (
            <button
              key={s.tag}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Page ${i + 1} of ${SLIDES.length}`}
              aria-current={i === index ? 'step' : undefined}
              className={`touch-target flex items-center justify-center rounded-full ${focusRing}`}
            >
              {/* Active dot is wider (24 vs 8 px), not only a different colour. */}
              <span
                className={`block h-2 rounded-full transition-all motion-reduce:transition-none ${
                  i === index ? 'w-6 bg-terracotta' : 'w-2 bg-sage'
                }`}
              />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => (last ? finish(true) : setIndex(index + 1))}
          className={`ml-auto flex h-14 shrink-0 items-center gap-2 rounded-full bg-navy px-4 text-base font-bold text-on-navy shadow-navy active:bg-navy-pressed ${focusRing}`}
        >
          {last ? 'Start exploring' : 'Next'}
          <ArrowForwardIcon size={20} />
        </button>
      </footer>
    </div>
  )
}
