import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { usePreferences } from '@/features/preferences/PreferencesContext'
import { ArrowForwardIcon } from '@/components/icons/ionicons'

/** UI Redesign #2: full-bleed Cebu photo with an editorial headline, then a rounded white sheet. */
const SLIDES = [
  {
    headline: 'Go where the map runs out.',
    title: 'Every corner has a story.',
    body: 'Discover heritage landmarks, ancestral homes, and coastal stories across Cebu.',
    image: '/authenticationBG/LoginDay.webp',
  },
  {
    headline: 'Point, snap, and ask bAI.',
    title: 'Point. Scan. Step into history.',
    body: 'Take or upload a photo of any landmark and ask bAI where it is or what shaped it.',
    image: '/landmarks/magellan.jpg',
  },
  {
    headline: 'Explore Cebu at your own pace.',
    title: 'Learn more with every laag.',
    body: 'Save places for offline reading, follow walking trails, and collect heritage badges.',
    image: '/onboarding/bridge.webp',
  },
] as const

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy'
const focusRingOnPhoto = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory'

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
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col bg-ivory-surface">
      {/* Over the photo in both themes, so the light palette is pinned for the white text. */}
      <header
        data-palette="light"
        className="absolute inset-x-0 top-0 z-20 grid grid-cols-[1fr_auto_1fr] items-center px-4 pt-[max(0.5rem,env(safe-area-inset-top))] text-ivory"
      >
        <span className="pl-2 font-mono text-xs font-bold tracking-[0.15em]">
          <span aria-hidden="true">EN</span>
          <span className="sr-only">Language: English</span>
        </span>
        <p className="font-display text-xl font-semibold tracking-tight" role="img" aria-label="Laag ta bAI">
          Laag ta <span className="font-bold italic">bAI</span>
        </p>
        <button
          type="button"
          onClick={() => finish(false)}
          aria-label="Skip onboarding"
          className={`touch-target justify-self-end rounded-full px-3 text-sm font-bold ${focusRingOnPhoto}`}
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

        <section data-palette="light" className="relative flex min-h-[56dvh] flex-col justify-end overflow-hidden bg-navy [@media(max-height:680px)]:min-h-[46dvh]">
          {/* key restarts the fade on every slide; motion-reduce turns it off. */}
          <img
            key={slide.image}
            src={slide.image}
            alt=""
            draggable={false}
            className="absolute inset-0 size-full animate-[fade-in_300ms_ease-out] object-cover motion-reduce:animate-none"
          />
          {/* Lagoon tint plus top and bottom scrims keep the white header and headline readable. */}
          <div className="absolute inset-0 bg-navy/20" aria-hidden="true" />
          <div className="absolute inset-0 bg-linear-to-b from-ink/45 via-ink/0 via-35% to-ink/65" aria-hidden="true" />
          <p
            key={slide.headline}
            className="relative px-6 pb-14 font-display text-[2.375rem] leading-[1.08] font-bold tracking-tight text-ivory animate-[fade-in_300ms_ease-out] motion-reduce:animate-none"
          >
            {slide.headline}
          </p>
        </section>

        <div className="relative z-10 -mt-8 flex flex-1 flex-col justify-center rounded-t-[2rem] bg-ivory-surface px-6 pt-10 pb-6 [@media(max-height:680px)]:pt-8">
          <div key={index} className="flex flex-col gap-3 animate-[fade-in_300ms_ease-out] motion-reduce:animate-none">
            <h1 className="font-display text-[2rem] leading-[1.15] font-bold tracking-tight text-ink">{slide.title}</h1>
            <p className="text-[0.9375rem] leading-7 text-ink-body">{slide.body}</p>
          </div>
        </div>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-x-2 gap-y-3 bg-ivory-surface px-6 pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="-ml-4 flex">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Page ${i + 1} of ${SLIDES.length}`}
              aria-current={i === index ? 'step' : undefined}
              className={`touch-target flex items-center justify-center rounded-full ${focusRing}`}
            >
              {/* Active dot is wider (28 vs 8 px), not only a different colour; inactive dots keep 3:1 as controls. */}
              <span
                className={`block h-2 rounded-full transition-all motion-reduce:transition-none ${
                  i === index ? 'w-7 bg-terracotta' : 'w-2 bg-line-strong'
                }`}
              />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => (last ? finish(true) : setIndex(index + 1))}
          className={`ml-auto flex h-14 shrink-0 items-center gap-2 rounded-xl bg-navy px-4 text-[0.9375rem] font-bold min-[400px]:px-7 min-[400px]:text-base text-on-navy shadow-navy active:bg-navy-pressed ${focusRing}`}
        >
          {last ? 'Start exploring' : 'Next'}
          <ArrowForwardIcon size={20} />
        </button>
      </footer>
    </div>
  )
}
