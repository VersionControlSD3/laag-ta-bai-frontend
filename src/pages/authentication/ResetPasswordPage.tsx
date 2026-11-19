import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { AuthCard, AuthScreen } from '@/components/AuthScreen'
import { useAuth } from '@/features/auth/AuthContext'
import { signInErrorMessage } from '@/features/auth/signInError'
import { supabase } from '@/lib/supabase'

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory'
const inputStyle = `h-14 w-full rounded-xl border border-ivory/35 bg-navy-pressed/70 px-4 text-ivory ${focus}`
const linkStyle = `self-center rounded font-bold text-terracotta-light underline underline-offset-4 ${focus}`

export default function ResetPasswordPage() {
  const auth = useAuth()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [updated, setUpdated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canReset = auth.status === 'signed-in' && auth.isPasswordRecovery && Boolean(supabase)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canReset || !supabase || busy) return
    if (password.length < 8 || password !== confirmation) {
      setError(password.length < 8 ? 'Use at least 8 characters.' : 'The passwords must match.')
      return
    }

    setError(null)
    setBusy(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setPassword('')
      setConfirmation('')
      setUpdated(true)
    } catch (err) {
      setError(signInErrorMessage(err, 'Could not update your password. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthScreen centered>
      <AuthCard>
        <h1 id="reset-password-title" className="text-center text-[2rem] font-black text-ivory">
          Reset Password
        </h1>
        {updated ? (
          <div className="mt-6 flex flex-col gap-4 text-center text-ivory">
            <p role="status">Your password has been updated.</p>
            <Link to="/" replace className={linkStyle}>Continue to Explore</Link>
          </div>
        ) : auth.status === 'loading' ? (
          <p role="status" className="mt-6 text-center text-ivory">Checking your reset link…</p>
        ) : canReset ? (
          <form
            noValidate
            aria-labelledby="reset-password-title"
            aria-busy={busy}
            onSubmit={submit}
            className="mt-6 flex flex-col gap-4"
          >
            <label className="flex flex-col gap-2 text-sm font-bold text-terracotta-light">
              New password
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputStyle}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-bold text-terracotta-light">
              Confirm new password
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className={inputStyle}
              />
            </label>
            {error && <p role="alert" className="text-sm font-semibold text-danger-line">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className={`min-h-14 rounded-xl bg-terracotta-ink font-bold text-ivory disabled:opacity-70 ${focus}`}
            >
              {busy ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        ) : (
          <div className="mt-6 flex flex-col gap-4 text-center text-ivory">
            <p>This reset link is invalid or expired.</p>
            {auth.status === 'signed-in' ? (
              <Link to="/" replace className={linkStyle}>Continue to Explore</Link>
            ) : (
              <Link to="/forgot-password" replace className={linkStyle}>Request a new reset link</Link>
            )}
          </div>
        )}
      </AuthCard>
    </AuthScreen>
  )
}
