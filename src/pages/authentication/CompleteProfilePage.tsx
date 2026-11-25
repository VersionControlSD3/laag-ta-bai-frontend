import { useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router'
import { useMe, useUpdateMe } from '@/api/hooks'
import { AuthScreen } from '@/components/AuthScreen'
import { NationalitySelect } from '@/components/NationalitySelect'
import { Loading } from '@/components/StateMessage'
import { useAuth } from '@/features/auth/AuthContext'
import { nationalityOptions } from '@/lib/nationality'
import { CustomDatePicker } from './SignUpPage'

/**
 * Pushed screen for accounts with no Terms acceptance (new Google sign-ins; see ProfileGate).
 * Same 18+ date of birth, nationality and Terms rules and error handling as the sign-up form.
 */
export default function CompleteProfilePage() {
  const auth = useAuth()
  const me = useMe()
  const save = useUpdateMe()
  const [form, setForm] = useState({ dateOfBirth: '', nationality: '', acceptedTerms: false })
  const [submitCount, setSubmitCount] = useState(0)
  const [dobTypedInvalid, setDobTypedInvalid] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  useLayoutEffect(() => {
    const firstInvalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
    firstInvalid?.focus({ preventScroll: true })
    firstInvalid?.scrollIntoView?.({ block: 'center' })
  }, [submitCount])

  if (auth.status === 'signed-out') return <Navigate to="/login" replace />
  // Saving refetches the profile; once Terms are recorded the app opens.
  if (me.data?.profile.termsAcceptedAt) return <Navigate to="/" replace />
  if (auth.status === 'loading' || me.isPending) return <Loading />

  const now = new Date()
  const maxBirthDate = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate())
  const isUnderage = Boolean(form.dateOfBirth) && new Date(`${form.dateOfBirth}T00:00:00`) > maxBirthDate
  const nationalityValid = nationalityOptions.includes(form.nationality)
  const submitted = submitCount > 0
  const birthDateInvalid = submitted && (!form.dateOfBirth || isUnderage)
  const nationalityInvalid = submitted && !nationalityValid
  const termsInvalid = submitted && !form.acceptedTerms
  const update = (field: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }))
  const fieldError = (message: string, id: string) => <span id={id} className="auth-field-error" role="alert">{message}</span>

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitCount((count) => count + 1)
    if (!form.dateOfBirth || isUnderage || !nationalityValid || !form.acceptedTerms) return
    // Date of birth is only for the 18+ check above: it is never stored or sent (Privacy Policy).
    save.mutate({ nationality: form.nationality, acceptTerms: true })
  }

  return (
    <AuthScreen>
      <div className="auth-signup">
        <h1 className="text-center font-display text-[2.25rem] leading-[1.15] font-bold tracking-tight text-ink">Complete your profile</h1>
        <p className="mt-1 text-center text-ink-muted">A few details before you start exploring.</p>

        <form ref={formRef} onSubmit={submit} noValidate className="mt-7 space-y-4">
          {/* A div, not a <label>: the field holds both the text input and the calendar button. */}
          <div>
            <label htmlFor="complete-dob" className="auth-label block">Date of birth <span aria-hidden="true">*</span></label>
            <CustomDatePicker
              id="complete-dob"
              value={form.dateOfBirth}
              onChange={(value) => update('dateOfBirth', value)}
              onTypedInvalid={setDobTypedInvalid}
              invalid={birthDateInvalid}
              describedBy={birthDateInvalid ? 'complete-dob-hint complete-dob-error' : 'complete-dob-hint'}
            />
            <span id="complete-dob-hint" className="mt-1 block text-xs text-ink-muted">Only used to check you are 18 or older. It is not stored or sent to our servers.</span>
            {birthDateInvalid && fieldError(isUnderage ? 'You must be at least 18 to use Laag ta bAI.' : dobTypedInvalid ? 'Enter a real date as mm/dd/yyyy.' : 'Date of birth is required.', 'complete-dob-error')}
          </div>
          <div className="min-w-0">
            <label htmlFor="complete-nationality" className="auth-label mb-2 block">Nationality <span aria-hidden="true">*</span></label>
            <NationalitySelect
              id="complete-nationality"
              required
              value={form.nationality}
              onValueChange={(value) => update('nationality', value)}
              className={`h-14 w-full rounded-xl border bg-ivory-deep px-4 text-base text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${nationalityInvalid ? 'border-danger' : 'border-ivory-line'}`}
              aria-invalid={nationalityInvalid}
              aria-describedby={nationalityInvalid ? 'complete-nationality-error' : undefined}
            />
            {nationalityInvalid && fieldError('Nationality is required.', 'complete-nationality-error')}
          </div>
          <label className="flex min-h-12 items-center gap-3 text-sm text-ink-body">
            <input type="checkbox" checked={form.acceptedTerms} onChange={(e) => update('acceptedTerms', e.target.checked)} aria-invalid={termsInvalid} aria-describedby={termsInvalid ? 'complete-terms-error' : undefined} className={`auth-terms-checkbox size-5 shrink-0 accent-navy ${termsInvalid ? 'auth-terms-checkbox-invalid' : ''}`} />
            <span>I agree to the <a href="/terms" target="_blank" rel="noreferrer" className="font-semibold text-navy underline">Terms</a> and <a href="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-navy underline">Privacy Policy</a>. <span aria-hidden="true">*</span></span>
          </label>
          {termsInvalid && <p id="complete-terms-error" className="text-sm font-semibold text-danger" role="alert">You must accept the Terms and Privacy Policy.</p>}
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
