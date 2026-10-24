import { useEffect } from 'react'
import { useNavigate } from 'react-router'

export default function SplashScreenPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      navigate('/welcome', { replace: true })
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [navigate])

  return (
    <main
      className="artifact-splash flex min-h-dvh flex-col items-center justify-center"
      aria-label="Preparing your Cebu journey"
    >
      <section
        className="artifact-splash-content grid w-full max-w-[385px] grid-rows-[auto_auto_auto] justify-items-center"
        aria-label="Loading"
      >
        <img
          src="/brand/NewLogo.png"
          alt="Laag ta bAI"
          className="artifact-splash-logo h-auto w-[200px]"
          onError={(event) => {
            event.currentTarget.src = '/brand/logo-icon.png'
          }}
        />
        <img
          src="/brand/NewLogoTitle.png"
          alt=""
          aria-hidden="true"
          className="artifact-splash-title mt-4 h-auto w-[274px]"
          onError={(event) => {
            event.currentTarget.src = '/brand/logo-text.png'
          }}
        />
        <div className="mt-16 flex flex-col items-center">
          <div
            className="artifact-progress-track"
            role="progressbar"
            aria-label="Loading progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={52}
          >
            <div className="artifact-progress-value" />
          </div>
          <p className="artifact-splash-caption">Preparing your Cebu journey</p>
        </div>
      </section>
    </main>
  )
}