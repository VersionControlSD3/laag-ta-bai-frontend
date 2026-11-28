import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { AuthCard, AuthScreen } from '@/components/AuthScreen'
import { EyeOffOutlineIcon, EyeOutlineIcon } from '@/components/icons/ionicons'
import { useAuth } from '@/features/auth/AuthContext'
import { signInErrorMessage } from '@/features/auth/signInError'
import { supabase } from '@/lib/supabase'

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory'
const inputStyle = `h-14 w-full rounded-xl border border-ivory/35 bg-navy-pressed/70 px-4 text-ivory ${focus}`
const linkStyle = `inline-flex min-h-12 min-w-12 items-center justify-center self-center rounded font-bold text-terracotta-light underline underline-offset-4 ${focus}`

function PasswordField({
  label,
  value,
  onChange,
  minLength,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  minLength?: number
}) {
  const [visible, setVisible] = useState(false)
  // The toggle sits outside the <label> so its aria-label doesn't leak into the input's name.
  return (
    <div className="relative">
      <label className="flex flex-col gap-2 text-sm font-bold text-terracotta-light">
        {label}
        <input
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          required
          minLength={minLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${inputStyle} pr-14`}
        />
      </label>
      <button
        type="button"
        onClick={() => setVisible((shown) => !shown)}
        aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        className={`touch-target absolute right-1 bottom-1 flex items-center justify-center rounded-full text-ivory/80 hover:text-ivory ${focus}`}
      >
        {visible ? <EyeOffOutlineIcon size={20} /> : <EyeOutlineIcon size={20} />}
      </button>
    </div>
  )
}

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
        <p role="status" className="mt-6 text-center text-ivory">
          {updated ? 'Your password has been updated.' : auth.status === 'loading' ? 'Checking your reset link…' : ''}
        </p>
        <p role="alert" className="text-center text-sm font-semibold text-danger-line">{error ?? ''}</p>
        {updated ? (
          <div className="mt-6 flex flex-col gap-4 text-center text-ivory">
            <Link to="/" replace className={linkStyle}>Continue to Explore</Link>
          </div>
        ) : auth.status === 'loading' ? (
          null
        ) : canReset ? (
          <form
            noValidate
            aria-labelledby="reset-password-title"
            aria-busy={busy}
            onSubmit={submit}
            className="mt-6 flex flex-col gap-4"
          >
            <PasswordField label="New password" value={password} onChange={setPassword} minLength={8} />
            <PasswordField label="Confirm new password" value={confirmation} onChange={setConfirmation} />
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
