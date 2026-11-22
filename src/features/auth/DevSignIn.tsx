import { useNavigate } from 'react-router'
import { useAuth } from './AuthContext'

/**
 * Shown instead of the sign-in form when Supabase keys are missing.
 *
 * `tone` exists because the sign-up card is always dark navy while the sign-in
 * page follows the light/dark theme; the "notice" tone sets an explicit text
 * colour so the copy never renders ivory-on-ivory (PR #17 review).
 */
export function DevSignIn({ tone = 'brand' }: { tone?: 'brand' | 'notice' }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const notice = tone === 'notice'
  return (
    <div
      className={`rounded-2xl border border-dashed p-4 text-sm ${notice ? 'border-terracotta/60 bg-ivory-deep text-ink' : 'border-primary/60 bg-surface'}`}
    >
      <p className="font-semibold">Supabase isn't configured.</p>
      <p className={`mt-1 ${notice ? 'text-ink-body' : 'text-muted'}`}>
        Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> for real accounts, or continue as a local
        test user (works with the API in memory mode).
      </p>
      <button
        type="button"
        onClick={() => {
          auth.signInAsDev()
          navigate('/')
        }}
        className={`touch-target mt-3 w-full font-bold ${notice ? 'min-h-12 rounded-xl bg-navy text-on-navy' : 'rounded-2xl bg-primary text-on-primary'}`}
      >
        Continue as dev traveler
      </button>
    </div>
  )
}
