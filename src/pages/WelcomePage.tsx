import { useNavigate } from 'react-router'
import { usePreferences } from '@/features/preferences/PreferencesContext'

/** First-run welcome, after the reference onboarding screens. */
export default function WelcomePage() {
  const prefs = usePreferences()
  const navigate = useNavigate()
  const finish = (to: string) => {
    prefs.update({ onboarded: true })
    navigate('/permissions', { replace: true, state: { next: to } })
  }
  return (
    <div
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-end bg-cover bg-center"
      style={{ backgroundImage: 'linear-gradient(to bottom, rgb(43 14 14 / 0.2), #2b0e0e 70%), url(/brand/welcome.jpg)' }}
    >
      <div className="px-6 pb-12 text-cream" style={{ paddingBottom: 'max(48px, env(safe-area-inset-bottom))' }}>
        <img src="/brand/logo-text.png" alt="Laag ta bAI" className="mb-4 h-14" />
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight">Discover Cebu's heritage, one photo at a time.</h1>
        <p className="mt-3 text-cream/80">Scan landmarks, hear their stories from your AI buddy, and earn badges as you explore.</p>
        <button type="button" onClick={() => finish('/register')} className="touch-target mt-8 w-full rounded-2xl bg-gold text-lg font-bold text-maroon">
          Laag ta! (Let's go)
        </button>
        <button type="button" onClick={() => finish('/login')} className="touch-target mt-3 w-full rounded-2xl border border-cream/40 font-bold">
          I already have an account
        </button>
        <button type="button" onClick={() => finish('/')} className="touch-target mt-2 w-full text-sm text-cream/70 underline">
          Explore as a guest
        </button>
      </div>
    </div>
  )
}
