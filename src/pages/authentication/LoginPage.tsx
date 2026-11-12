import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { AuthCard, AuthScreen } from '@/components/AuthScreen'
import {
  EyeOffOutlineIcon,
  EyeOutlineIcon,
  LockClosedOutlineIcon,
  LogoGoogleIcon,
  MailOutlineIcon,
  SparklesOutlineIcon,
} from '@/components/icons/ionicons'
import { useAuth } from '@/features/auth/AuthContext'
import { DevSignIn } from '@/features/auth/DevSignIn'
import { signInErrorMessage } from '@/features/auth/signInError'
import { usePreferences } from '@/features/preferences/PreferencesContext'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory'

/**
 * Figma Final Pages "Login (Day)" / "Login (Night)" (268:7254, 268:7370). Email login goes
 * through the API (`POST /v1/auth/login`), which returns the bearer token the rest of the API
 * accepts; Google sign-in goes straight to Supabase OAuth.
 */
export default function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const night = usePreferences().resolvedTheme === 'dark'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState<'password' | 'google' | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (auth.status === 'signed-in') return <Navigate to="/" replace />

  const emailValid = EMAIL.test(email.trim())
  const emailError = submitted && !emailValid ? (email.trim() ? 'Enter a valid email address.' : 'Enter your email.') : null
  const passwordError = submitted && !password ? 'Enter your password.' : null

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
      setError(signInErrorMessage(e))
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
      setError(signInErrorMessage(e, 'Google sign-in failed. Please try again.'))
      setBusy(null)
    }
  }

  // Day photo: lighter field wells; night photo: darker ones, as in the two Figma frames.
  const well = night ? 'bg-navy-pressed/70' : 'bg-navy-pressed/35'

  return (
    <AuthScreen>
      <AuthCard>
        <header className="flex flex-col items-center text-center">
          <p lang="ceb" className="flex items-center gap-1.5 text-[0.6875rem] font-bold tracking-[0.12em] text-terracotta-light uppercase">
            <SparklesOutlineIcon size={16} />
            Maayong pagbalik
          </p>
          <h1 className="pt-2 text-[2rem] leading-[1.2] font-black text-ivory">Log In</h1>
          <p className="pt-2 text-base text-ivory/85">Your heritage journey awaits.</p>
        </header>

        <form noValidate onSubmit={submit} aria-busy={busy === 'password'} className="mt-8 flex flex-col gap-4">
          <Field label="Email" icon={<MailOutlineIcon size={20} />} error={emailError} well={well}>
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
            label="Password"
            icon={<LockClosedOutlineIcon size={20} />}
            error={passwordError}
            well={well}
            action={
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className={`touch-target -mr-3 flex shrink-0 items-center justify-center rounded-full text-ivory/90 hover:text-ivory ${focus}`}
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

          {error && (
            <p role="alert" className="rounded-xl border border-danger-line bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy !== null}
            className={`mt-4 min-h-14 w-full rounded-xl bg-terracotta-ink text-[0.9375rem] font-bold tracking-[0.08em] text-ivory uppercase shadow-lg transition-colors hover:bg-terracotta-ink/90 disabled:opacity-70 ${focus}`}
          >
            {busy === 'password' ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        {/* Memory-mode API without Supabase: email login works against the API's in-memory accounts,
            and the dev traveler stays as a shortcut. */}
        {auth.mode === 'dev' && (
          <div className="mt-6">
            <DevSignIn tone="notice" />
          </div>
        )}

        <div className="mt-4 flex justify-center">
          <Link
            to="/"
            className={`flex min-h-12 items-center rounded-lg px-3 text-[0.9375rem] font-bold text-ivory underline underline-offset-4 ${focus}`}
          >
            Continue as Guest
          </Link>
        </div>

        {/* Facebook and Apple are in Figma but not enabled in Supabase yet; only Google works. */}
        {auth.mode === 'supabase' && (
          <>
            <div className="mt-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-ivory/40" aria-hidden />
              <p className="text-[0.625rem] font-bold tracking-[0.16em] text-ivory/80 uppercase">Or continue with</p>
              <span className="h-px flex-1 bg-ivory/40" aria-hidden />
            </div>
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={continueWithGoogle}
                disabled={busy !== null}
                aria-busy={busy === 'google'}
                aria-label="Continue with Google"
                className={`flex size-13 items-center justify-center rounded-full border border-ivory/35 bg-sage/15 text-ivory transition-colors hover:bg-sage/25 disabled:opacity-70 ${focus}`}
              >
                <LogoGoogleIcon size={22} />
              </button>
            </div>
          </>
        )}

        <p className="mt-4 flex flex-wrap items-center justify-center gap-x-1.5 text-sm text-ivory/85">
          New here?
          <Link
            to="/register"
            className={`flex min-h-12 items-center rounded-lg font-bold text-terracotta-light underline underline-offset-4 ${focus}`}
          >
            Create Account
          </Link>
        </p>
      </AuthCard>
    </AuthScreen>
  )
}

type InputProps = { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string; className: string }

/** Figma TextField on the auth card: uppercase label, 56px well, terracotta-light icon. */
function Field({
  label,
  icon,
  error,
  well,
  action,
  children,
}: {
  label: string
  icon: ReactNode
  error: string | null
  well: string
  action?: ReactNode
  children: (props: InputProps) => ReactNode
}) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-bold tracking-[0.14em] text-terracotta-light uppercase">
        {label}
      </label>
      <div
        className={`flex h-14 items-center gap-3 rounded-xl border px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ivory ${well} ${
          error ? 'border-danger-line' : 'border-ivory/35'
        }`}
      >
        <span className="shrink-0 text-terracotta-light">{icon}</span>
        {children({
          id,
          'aria-invalid': Boolean(error),
          'aria-describedby': error ? errorId : undefined,
          className: 'h-full min-w-0 flex-1 bg-transparent text-base text-ivory outline-none placeholder:text-ivory/70',
        })}
        {action}
      </div>
      {/* danger-line is the light red that reads on the navy card (5.9:1); the text says what's wrong. */}
      {error && (
        <p id={errorId} className="text-sm font-semibold text-danger-line">
          {error}
        </p>
      )}
    </div>
  )
}
