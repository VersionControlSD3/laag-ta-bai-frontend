import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router'
import { useMe, useUpdateMe } from '@/api/hooks'
import { AuthScreen } from '@/components/AuthScreen'
import { Loading } from '@/components/StateMessage'
import { useAuth } from '@/features/auth/AuthContext'
import { CustomDatePicker } from './SignUpPage'

/**
 * Pushed screen for accounts with no Terms acceptance (new Google sign-ins; see ProfileGate).
 * Same 18+ date of birth, nationality and Terms rules as the sign-up form.
 */
export default function CompleteProfilePage() {
  const auth = useAuth()
  const me = useMe()
  const save = useUpdateMe()
  const [form, setForm] = useState({ dateOfBirth: '', nationality: '', acceptedTerms: false })
  const [submitted, setSubmitted] = useState(false)

  if (auth.status === 'signed-out') return <Navigate to="/login" replace />
  // Saving refetches the profile; once Terms are recorded the app opens.
  if (me.data?.profile.termsAcceptedAt) return <Navigate to="/" replace />
  if (auth.status === 'loading' || me.isPending) return <Loading />

  const now = new Date()
  const maxBirthDate = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate())
  const isUnderage = Boolean(form.dateOfBirth) && new Date(`${form.dateOfBirth}T00:00:00`) > maxBirthDate
  const nationality = form.nationality.trim()
  const update = (field: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }))
  const fieldError = (message: string) => <span className="auth-field-error" role="alert">{message}</span>

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (!form.dateOfBirth || isUnderage || !nationality || !form.acceptedTerms) return
    // Date of birth is only for the 18+ check above: it is never stored or sent (Privacy Policy).
    save.mutate({ nationality, acceptTerms: true })
  }

  return (
    <AuthScreen>
      <div className="auth-signup">
        <h1 className="text-center font-display text-[2.25rem] leading-[1.15] font-bold tracking-tight text-ink">Complete your profile</h1>
        <p className="mt-1 text-center text-ink-muted">A few details before you start exploring.</p>

        <form onSubmit={submit} noValidate className="mt-7 space-y-4">
          <label className="auth-label block">Date of birth <span aria-hidden="true">*</span>
            <CustomDatePicker value={form.dateOfBirth} onChange={(value) => update('dateOfBirth', value)} invalid={submitted && (!form.dateOfBirth || isUnderage)} />
            <span className="mt-1 block text-xs font-normal text-ink-muted">Only used to check you are 18 or older. It is not stored or sent to our servers.</span>
            {submitted && !form.dateOfBirth && fieldError('Date of birth is required.')}
            {submitted && isUnderage && fieldError('You must be at least 18 to use Laag ta bAI.')}
          </label>
          <label className="auth-label block">Nationality <span aria-hidden="true">*</span>
            <input
              required
              maxLength={60}
              autoComplete="country-name"
              value={form.nationality}
              onChange={(e) => update('nationality', e.target.value)}
              aria-invalid={submitted && !nationality}
              className={`mt-2 h-14 w-full rounded-xl border bg-ivory-deep px-4 text-base text-ink outline-none placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${submitted && !nationality ? 'border-danger' : 'border-ivory-line'}`}
            />
            {submitted && !nationality && fieldError('Nationality is required.')}
          </label>
          <label className="flex min-h-12 items-center gap-3 text-sm text-ink-body">
            <input type="checkbox" checked={form.acceptedTerms} onChange={(e) => update('acceptedTerms', e.target.checked)} className={`auth-terms-checkbox size-5 shrink-0 accent-navy ${submitted && !form.acceptedTerms ? 'auth-terms-checkbox-invalid' : ''}`} />
            <span>I agree to the <a href="/terms" target="_blank" rel="noreferrer" className="font-semibold text-navy underline">Terms</a> and <a href="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-navy underline">Privacy Policy</a>. <span aria-hidden="true">*</span></span>
          </label>
          {submitted && !form.acceptedTerms && <p className="text-sm font-semibold text-danger" role="alert">You must accept the Terms and Privacy Policy.</p>}
          {save.error && <p role="alert" className="rounded-xl border border-danger-line bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{save.error.message}</p>}

          <button type="submit" disabled={save.isPending} className="min-h-14 w-full rounded-xl bg-navy text-base font-bold text-on-navy shadow-navy transition-colors hover:bg-navy-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:opacity-60">{save.isPending ? 'Saving…' : 'Continue'}</button>
        </form>

        <p className="mt-4 flex flex-wrap items-center justify-center gap-x-1.5 text-sm text-ink-muted">
          Not you, or not ready?
          <button type="button" onClick={() => void auth.signOut()} className="flex min-h-12 items-center rounded-lg font-bold text-navy underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-navy">Sign out</button>
        </p>
      </div>
    </AuthScreen>
  )
}
