import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '@/features/auth/AuthContext'

function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <img src="/brand/logo-icon.png" alt="" className="mx-auto mb-4 h-20 w-20" />
      <h1 className="text-center text-3xl font-extrabold text-primary">{title}</h1>
      <p className="mb-8 mt-1 text-center text-muted">{subtitle}</p>
      {children}
    </div>
  )
}

const input = 'mt-1 h-12 w-full rounded-2xl border border-line bg-surface px-4 outline-none focus:border-primary'

function DevSignIn() {
  const auth = useAuth()
  const navigate = useNavigate()
  return (
    <div className="rounded-2xl border border-dashed border-primary/60 bg-surface p-4 text-sm">
      <p className="font-semibold">Supabase isn't configured.</p>
      <p className="mt-1 text-muted">
        Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> for real accounts, or continue as a local
        test user (works with the API in memory mode).
      </p>
      <button
        type="button"
        onClick={() => {
          auth.signInAsDev()
          navigate('/')
        }}
        className="touch-target mt-3 w-full rounded-2xl bg-primary font-bold text-on-primary"
      >
        Continue as dev traveler
      </button>
    </div>
  )
}

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await auth.signIn(email, password)
      navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue your journey">
      {auth.mode === 'dev' ? (
        <DevSignIn />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-semibold">
            Email
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
          </label>
          <label className="block text-sm font-semibold">
            Password
            <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
          </label>
          {error && <p role="alert" className="text-sm font-semibold text-crimson">{error}</p>}
          <button type="submit" disabled={busy} className="touch-target w-full rounded-2xl bg-primary font-bold text-on-primary disabled:opacity-60">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        New here? <Link to="/register" className="font-bold text-primary underline">Create an account</Link>
      </p>
      <Link to="/" className="mt-3 block text-center text-sm text-muted underline">Explore as a guest</Link>
    </AuthLayout>
  )
}

export function RegisterPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ displayName: '', email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [confirmEmail, setConfirmEmail] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { needsConfirmation } = await auth.signUp(form)
      if (needsConfirmation) setConfirmEmail(true)
      else navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign up failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Join Laag ta bAI" subtitle="Create your traveler profile">
      {auth.mode === 'dev' ? (
        <DevSignIn />
      ) : confirmEmail ? (
        <p role="status" className="rounded-2xl border border-line bg-surface p-4 text-center">
          Check <strong>{form.email}</strong> for a confirmation link, then sign in.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-semibold">
            Display name
            <input required maxLength={60} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className={input} />
          </label>
          <label className="block text-sm font-semibold">
            Email
            <input type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} />
          </label>
          <label className="block text-sm font-semibold">
            Password
            <input type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={input} />
          </label>
          {error && <p role="alert" className="text-sm font-semibold text-crimson">{error}</p>}
          <button type="submit" disabled={busy} className="touch-target w-full rounded-2xl bg-primary font-bold text-on-primary disabled:opacity-60">
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        Already have an account? <Link to="/login" className="font-bold text-primary underline">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
