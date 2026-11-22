import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router'

/**
 * First-launch splash (UI Redesign #1). It stays ivory in both themes: the installed PWA's own
 * launch screen uses the manifest's ivory background_color, and the logo artwork is lagoon teal on
 * transparent, so a dark splash would flash and lose the logo.
 */
export default function SplashScreenPage() {
  const navigate = useNavigate()
  const goToOnboarding = useCallback(() => {
    navigate('/onboarding', { replace: true })
  }, [navigate])

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      goToOnboarding()
      return
    }

    const timer = window.setTimeout(goToOnboarding, 1500)
    return () => window.clearTimeout(timer)
  }, [goToOnboarding])

  return (
    <main
      data-theme="light"
      className="flex min-h-dvh cursor-pointer flex-col items-center justify-center bg-ivory px-6 text-ink focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-navy"
      aria-label="Preparing your Cebu journey"
      onClick={goToOnboarding}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          goToOnboarding()
        }
      }}
      tabIndex={0}
    >
      <section className="flex w-full max-w-sm flex-col items-center" aria-label="Loading">
        <img
          src="/brand/NewLogo.png"
          alt="Laag ta bAI"
          width={800}
          height={800}
          className="h-auto w-[min(15.5rem,52vw)]"
        />
        <img
          src="/brand/NewLogoTitle.png"
          alt=""
          aria-hidden="true"
          width={1174}
          height={221}
          className="mt-3 h-auto w-[min(20.5rem,70vw)]"
        />
        <div className="mt-20 flex flex-col items-center">
          <div
            className="h-1 w-[min(13.5rem,46vw)] overflow-hidden rounded-full bg-navy/10"
            role="progressbar"
            aria-label="Loading progress"
          >
            <div className="h-full w-2/5 animate-[splash-progress_1.5s_ease-in-out_infinite] rounded-full bg-linear-to-r from-terracotta to-sage motion-reduce:translate-x-[75%] motion-reduce:animate-none" />
          </div>
          <p className="mt-4 text-xs font-bold tracking-[0.12em] text-ink-muted uppercase">
            Preparing your Cebu journey
          </p>
        </div>
      </section>
    </main>
  )
}
