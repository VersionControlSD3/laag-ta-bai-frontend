import { useId, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router'
import { AuthCard, AuthScreen } from '@/components/AuthScreen'
import { MailOutlineIcon } from '@/components/icons/ionicons'
import { useAuth } from '@/features/auth/AuthContext'
import { signInErrorMessage } from '@/features/auth/signInError'
import { usePreferences } from '@/features/preferences/PreferencesContext'
import { supabase } from '@/lib/supabase'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory'

/**
 * Figma Final Pages "Forgot Password (Day)" / "Forgot Password (Night)".
 * Uses LoginDay.webp in light mode and LoginNight.webp in dark mode via AuthScreen,
 * with the matching glass card and field well opacities for each theme.
 */
export function ForgotPasswordPage() {
  const auth = useAuth()
  const night = usePreferences().resolvedTheme === 'dark'
  const emailId = useId()
  const statusId = `${emailId}-status`
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (auth.status === 'signed-in') return <Navigate to="/" replace />

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedEmail = email.trim()

    if (!normalizedEmail) {
      setSubmitted(false)
      setError('Please enter your email address.')
      return
    }

    if (!EMAIL.test(normalizedEmail)) {
      setSubmitted(false)
      setError('Please enter a valid email address.')
      return
    }

    setError(null)

    if (!supabase) {
      setSubmitted(false)
      setError('Password reset is not available right now.')
      return
    }

    if (supabase) {
      setBusy(true)
      try {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (resetError) {
          setSubmitted(false)
          setError(signInErrorMessage(resetError, 'Could not send reset link. Please try again.'))
          return
        }
      } catch (err) {
        setSubmitted(false)
        setError(signInErrorMessage(err, 'Could not send reset link. Please try again.'))
        return
      } finally {
        setBusy(false)
      }
    }

    setSubmitted(true)
  }

  // Day photo uses the more opaque navy card and lighter field well; night photo uses the translucent blurred card and darker field well.
  const cardSurface = night
    ? 'bg-linear-to-br from-navy/45 to-navy-pressed/40'
    : 'bg-linear-to-br from-navy/90 to-navy-pressed/80'
  const well = night ? 'bg-navy-pressed/70' : 'bg-navy-pressed/35'

  return (
    <AuthScreen centered>
      <AuthCard className={`rounded-[28px] border border-ivory/30 px-6 py-8 shadow-2xl backdrop-blur-[18px] ${cardSurface}`}>
        <header className="flex flex-col items-center text-center">
          <div
            aria-hidden="true"
            className="flex size-14 items-center justify-center rounded-full bg-terracotta text-ivory shadow-lg"
          >
            <MailOutlineIcon size={24} />
          </div>
          <h1
            id="forgot-password-title"
            className="pt-4 text-[2rem] leading-[1.2] font-black text-ivory"
          >
            Forgot Password?
          </h1>
          <p className="pt-2 text-base leading-6 text-ivory/85">
            Enter your email and we&apos;ll send you a secure reset link.
          </p>
        </header>

        <form
          noValidate
          aria-labelledby="forgot-password-title"
          aria-describedby={submitted ? statusId : error ? `${statusId}-error` : undefined}
          aria-busy={busy}
          onSubmit={handleSubmit}
          className="mt-8 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor={emailId}
              className="text-xs leading-[1.4] font-bold tracking-[0.14em] text-terracotta-light uppercase"
            >
              Email
            </label>
            <div
              className={`flex h-14 items-center gap-3 rounded-xl border px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ivory ${well} ${
                error ? 'border-danger-line' : 'border-ivory/35'
              }`}
            >
              <span className="shrink-0 text-terracotta-light" aria-hidden="true">
                <MailOutlineIcon size={21} />
              </span>
              <input
                id={emailId}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="explorer@example.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  if (error) setError(null)
                  if (submitted) setSubmitted(false)
                }}
                aria-invalid={Boolean(error)}
                aria-describedby={submitted ? statusId : error ? `${statusId}-error` : undefined}
                className="h-full min-w-0 flex-1 bg-transparent text-base text-ivory outline-none placeholder:text-ivory/70"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className={`min-h-14 w-full cursor-pointer rounded-xl bg-terracotta text-[0.9375rem] leading-[1.3125rem] font-bold tracking-[0.08em] text-ivory uppercase shadow-lg transition-colors hover:bg-terracotta/90 disabled:opacity-70 ${focus}`}
          >
            {busy ? 'Sending…' : 'Send Reset Link'}
          </button>

          <p id={statusId} role="status" className="text-center text-sm leading-5 text-ivory">
            {submitted ? 'Your secure reset link is on its way.' : ''}
          </p>
          <p id={`${statusId}-error`} role="alert" className="text-center text-sm leading-5 font-semibold text-danger-line">
            {error ?? ''}
          </p>
        </form>
      </AuthCard>
    </AuthScreen>
  )
}

export { ForgotPasswordPage as ForgotPassword }
export default ForgotPasswordPage
