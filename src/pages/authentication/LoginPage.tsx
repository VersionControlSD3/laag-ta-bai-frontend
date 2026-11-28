import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { AuthScreen } from '@/components/AuthScreen'
import {
  EyeOffOutlineIcon,
  EyeOutlineIcon,
  LockClosedOutlineIcon,
  LogoGoogleIcon,
  MailOutlineIcon,
} from '@/components/icons/ionicons'
import { useAuth } from '@/features/auth/AuthContext'
import { DevSignIn } from '@/features/auth/DevSignIn'
import { signInErrorMessage } from '@/features/auth/signInError'
import { useT } from '@/i18n'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy'

/**
 * UI Redesign #3 login (ClickUp 14yj85p54bw), on the AuthScreen photo band and sheet. Email login goes
 * through the API (`POST /v1/auth/login`), which returns the bearer token the rest of the API
 * accepts; Google sign-in goes straight to Supabase OAuth.
 */
export default function LoginPage() {
  const auth = useAuth()
  const t = useT()
  const { fields, login } = t.auth
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState<'password' | 'google' | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (auth.status === 'signed-in') return <Navigate to="/" replace />

  const emailValid = EMAIL.test(email.trim())
  const emailError = submitted && !emailValid ? (email.trim() ? fields.emailInvalid : fields.emailRequired) : null
  const passwordError = submitted && !password ? fields.passwordRequired : null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    setError(null)
    if (!emailValid || !password) return
    setBusy('password')
    try {
      await auth.signIn(email.trim(), password)
      navigate('/', { replace: true })
    } catch (e) {
      setError(signInErrorMessage(e, t))
      setBusy(null)
    }
  }

  const continueWithGoogle = async () => {
    setError(null)
    setBusy('google')
    try {
      // Redirects to Google and back; the session arrives through onAuthStateChange.
      await auth.signInWithGoogle()
    } catch (e) {
      setError(signInErrorMessage(e, t, t.auth.errors.googleFailed))
      setBusy(null)
    }
  }

  return (
    <AuthScreen>
      <header className="flex flex-col items-center text-center">
        <p lang="ceb" className="font-display text-base text-ink-muted italic">
          {login.welcome}
        </p>
        <h1 className="pt-1 font-display text-[2.25rem] leading-[1.15] font-bold tracking-tight text-ink">{login.title}</h1>
      </header>

      <form noValidate onSubmit={submit} aria-busy={busy === 'password'} className="mt-6 flex flex-col gap-4">
        <Field label={fields.email} icon={<MailOutlineIcon size={20} />} error={emailError}>
          {(props) => (
            <input
              {...props}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="explorer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>
        <Field
          label={fields.password}
          icon={<LockClosedOutlineIcon size={20} />}
          error={passwordError}
          action={
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? fields.hidePassword : fields.showPassword}
              className={`touch-target -mr-3 flex shrink-0 items-center justify-center rounded-full text-ink-muted hover:text-ink ${focus}`}
            >
              {showPassword ? <EyeOffOutlineIcon size={20} /> : <EyeOutlineIcon size={20} />}
            </button>
          }
        >
          {(props) => (
            <input
              {...props}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>

        <Link
          to="/forgot-password"
          className={`-mt-2 flex min-h-12 items-center self-end rounded-lg text-sm font-bold text-navy underline underline-offset-4 ${focus}`}
        >
          {login.forgot}
        </Link>

        {error && (
          <p role="alert" className="rounded-xl border border-danger-line bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy !== null}
          className={`mt-2 min-h-14 w-full rounded-xl bg-navy text-base font-bold text-on-navy shadow-navy transition-colors hover:bg-navy-pressed disabled:opacity-70 ${focus}`}
        >
          {busy === 'password' ? login.submitting : login.submit}
        </button>
      </form>

      {/* Memory-mode API without Supabase: email login works against the API's in-memory accounts,
          and the dev traveler stays as a shortcut. */}
      {auth.mode === 'dev' && (
        <div className="mt-5">
          <DevSignIn tone="notice" />
        </div>
      )}

      <Link
        to="/"
        className={`mt-4 flex min-h-14 w-full items-center justify-center rounded-xl border border-ivory-line bg-ivory-surface text-base font-semibold text-ink transition-colors hover:bg-ivory ${focus}`}
      >
        {login.guest}
      </Link>

      {/* Facebook and Apple are in Figma but not enabled in Supabase yet; only Google works. */}
      {auth.mode === 'supabase' && (
        <>
          <div className="mt-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-ivory-line" aria-hidden />
            <p className="text-xs font-semibold text-ink-muted">{login.orContinue}</p>
            <span className="h-px flex-1 bg-ivory-line" aria-hidden />
          </div>
          <div className="flex justify-center pt-3">
            <button
              type="button"
              onClick={continueWithGoogle}
              disabled={busy !== null}
              aria-busy={busy === 'google'}
              aria-label={login.google}
              className={`flex size-13 items-center justify-center rounded-full border border-ivory-line bg-ivory-surface text-ink transition-colors hover:bg-ivory disabled:opacity-70 ${focus}`}
            >
              <LogoGoogleIcon size={22} />
            </button>
          </div>
        </>
      )}

      <p className="mt-4 flex flex-wrap items-center justify-center gap-x-1.5 text-sm text-ink-muted">
        {login.newHere}
        <Link
          to="/register"
          className={`flex min-h-12 items-center rounded-lg font-bold text-navy underline underline-offset-4 ${focus}`}
        >
          {login.createAccount}
        </Link>
      </p>
    </AuthScreen>
  )
}

type InputProps = { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string; className: string }

/** Redesign text field: sentence-case label, 56px sand well, muted outline icon. */
function Field({
  label,
  icon,
  error,
  action,
  children,
}: {
  label: string
  icon: ReactNode
  error: string | null
  action?: ReactNode
  children: (props: InputProps) => ReactNode
}) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <div
        className={`flex h-14 items-center gap-3 rounded-xl border bg-ivory-deep px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-navy ${
          error ? 'border-danger' : 'border-ivory-line'
        }`}
      >
        <span className="shrink-0 text-ink-muted">{icon}</span>
        {children({
          id,
          'aria-invalid': Boolean(error),
          'aria-describedby': error ? errorId : undefined,
          className: 'h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-muted',
        })}
        {action}
      </div>
      {/* The text says what's wrong; the red border is only a second cue. */}
      {error && (
        <p id={errorId} className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
