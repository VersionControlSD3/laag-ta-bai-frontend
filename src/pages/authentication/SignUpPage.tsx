import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { AuthScreen } from '@/components/AuthScreen'
import {
  CalendarOutlineIcon,
  CheckmarkIcon,
  ChevronBackOutlineIcon,
  ChevronDownOutlineIcon,
  ChevronForwardOutlineIcon,
  CloseOutlineIcon,
  EyeOffOutlineIcon,
  EyeOutlineIcon,
} from '@/components/icons/ionicons'
import { useAuth } from '@/features/auth/AuthContext'
import { DevSignIn } from '@/features/auth/DevSignIn'
import './SignUpPage.css'

// Custom calendar controls keep the date picker consistent across browsers.
const MONTHS = Array.from({ length: 12 }, (_, month) => new Date(2000, month, 1).toLocaleString('en-US', { month: 'long' }))
// Unique labels: 'S' twice broke the React key on the weekday row.
const WEEKDAYS = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa']

function formatDate(value: string) {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  return `${month}/${day}/${year}`
}

/** Keeps only digits and inserts the slashes, so typing `01152000` shows `01/15/2000`. */
function maskDate(text: string) {
  const digits = text.replace(/\D/g, '').slice(0, 8)
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/')
}

/** `mm/dd/yyyy` → `yyyy-mm-dd`, or '' when the text isn't a complete, real calendar date. */
function parseTypedDate(text: string, minYear: number) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text)
  if (!match) return ''
  const [, month, day, year] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  const real = date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day)
  return real && Number(year) >= minYear ? `${year}-${month}-${day}` : ''
}

function CalendarSelect({ label, value, options, open, onToggle, onChange, isDisabled }: { label: string; value: number; options: string[]; open: boolean; onToggle: () => void; onChange: (value: number) => void; isDisabled?: (index: number) => boolean }) {
  return (
    <div className="auth-calendar-select">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={onToggle} className="auth-calendar-select-button">
        <span>{options[value]}</span>
        <ChevronDownOutlineIcon size={14} />
      </button>
      {open && (
        <div className={`auth-calendar-select-menu ${label === 'Month' ? 'auth-calendar-select-menu-month' : 'auth-calendar-select-menu-year'}`}>
          <div className="auth-calendar-select-scroll" role="listbox" aria-label={label}>
            {options.map((option, index) => (
              <button key={option} type="button" role="option" aria-selected={index === value} disabled={isDisabled?.(index)} className={index === value ? 'auth-calendar-select-option auth-calendar-select-option-selected' : 'auth-calendar-select-option'} onClick={() => onChange(index)}>
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Date of birth: a typeable `mm/dd/yyyy` field plus a calendar popover (ClickUp bug #9). Reports
 * the ISO date, or '' while the text is empty or incomplete; `onTypedInvalid` says whether the
 * field holds text that isn't a complete, real date, so the page can say that instead of "required".
 */
function CustomDatePicker({ id, value, onChange, onTypedInvalid, invalid, describedBy }: { id: string; value: string; onChange: (value: string) => void; onTypedInvalid: (invalid: boolean) => void; invalid: boolean; describedBy?: string }) {
  const today = new Date()
  const maxYear = today.getFullYear() - 18
  // Age gate: latest selectable date is today minus 18 years (PR #17 review).
  const maxBirthDate = new Date(maxYear, today.getMonth(), today.getDate())
  const selected = value ? new Date(`${value}T00:00:00`) : null
  const pickerRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [openSelect, setOpenSelect] = useState<'month' | 'year' | null>(null)
  const [openAbove, setOpenAbove] = useState(false)
  const [viewDate, setViewDate] = useState(() => selected ?? new Date(maxYear, today.getMonth(), 1))
  const minYear = maxYear - 100
  const [text, setText] = useState(() => formatDate(value))
  const [syncedValue, setSyncedValue] = useState(value)
  // A date picked in the calendar (or set from outside) replaces the typed text.
  if (value !== syncedValue) {
    setSyncedValue(value)
    if (value !== parseTypedDate(text, minYear)) setText(formatDate(value))
  }
  const typeDate = (raw: string) => {
    const masked = maskDate(raw)
    const iso = parseTypedDate(masked, minYear)
    setText(masked)
    onChange(iso)
    onTypedInvalid(masked.length > 0 && !iso)
    if (iso) setViewDate(clampViewDate(new Date(`${iso}T00:00:00`)))
  }
  const closeCalendar = () => {
    setOpen(false)
    setOpenSelect(null)
  }
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay()
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate()
  const days = Array.from({ length: firstDay + daysInMonth }, (_, index) => index < firstDay ? null : index - firstDay + 1)
  const years = Array.from({ length: 101 }, (_, index) => maxYear - index)
  /** Keeps the view month inside the `years` list so the Year button never goes blank. */
  const clampViewDate = (date: Date) => {
    const maxMonth = new Date(maxYear, today.getMonth(), 1)
    const minMonth = new Date(years[years.length - 1], 0, 1)
    return date > maxMonth ? maxMonth : date < minMonth ? minMonth : date
  }
  const atMaxMonth = viewDate.getFullYear() === maxYear && viewDate.getMonth() === today.getMonth()
  const atMinMonth = viewDate.getFullYear() === years[years.length - 1] && viewDate.getMonth() === 0
  const isUnderageMonth = (month: number) => viewDate.getFullYear() === maxYear && month > today.getMonth()
  const isUnderageDay = (day: number) => new Date(viewDate.getFullYear(), viewDate.getMonth(), day) > maxBirthDate
  const selectDate = (day: number) => {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onChange(iso)
    onTypedInvalid(false)
    closeCalendar()
  }
  const isSelected = (day: number) => selected?.getDate() === day && selected.getMonth() === viewDate.getMonth() && selected.getFullYear() === viewDate.getFullYear()

  useEffect(() => {
    if (!open) return
    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setOpenSelect(null)
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      setOpenSelect(null)
    }
    document.addEventListener('pointerdown', handleOutsidePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const updateCalendarPlacement = (revealIfClipped = false) => {
      const picker = pickerRef.current
      const calendar = calendarRef.current
      if (!picker || !calendar) return
      const pickerRect = picker.getBoundingClientRect()
      const calendarHeight = calendar.getBoundingClientRect().height
      const spacing = 8
      const bottomSpace = window.innerHeight - pickerRect.bottom
      const topSpace = pickerRect.top
      const fitsBelow = bottomSpace >= calendarHeight + spacing
      const fitsAbove = topSpace >= calendarHeight + spacing
      setOpenAbove(!fitsBelow && fitsAbove)
      // Fits neither way (short phone screens): scroll the page so the whole card, Clear
      // included, is on screen instead of running off the bottom (ClickUp bug #9).
      if (revealIfClipped && !fitsBelow && !fitsAbove) calendar.scrollIntoView?.({ block: 'nearest' })
    }
    updateCalendarPlacement(true)
    const onViewportChange = () => updateCalendarPlacement()
    window.addEventListener('resize', onViewportChange)
    window.addEventListener('scroll', onViewportChange, true)
    return () => {
      window.removeEventListener('resize', onViewportChange)
      window.removeEventListener('scroll', onViewportChange, true)
    }
  }, [open, openSelect])

  return (
    <div ref={pickerRef} className="relative mt-2">
      <div className={`auth-date-field ${invalid ? 'auth-date-field-invalid' : ''}`}>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="bday"
          placeholder="mm/dd/yyyy"
          maxLength={10}
          required
          value={text}
          onChange={(event) => typeDate(event.target.value)}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className="auth-date-input"
        />
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="Choose date of birth"
          onClick={() => {
            if (open) return closeCalendar()
            // Open on the chosen date, else on the "18 years ago" default — never
            // reset to the current month (PR #17 review).
            setViewDate(selected ?? new Date(maxYear, today.getMonth(), 1))
            setOpen(true)
          }}
          className="auth-date-toggle"
        >
          <CalendarOutlineIcon size={20} aria-hidden="true" />
        </button>
      </div>
      {open && (
        <div ref={calendarRef} className={`auth-calendar ${openAbove ? 'auth-calendar-above' : ''}`} role="dialog" aria-label="Choose date of birth">
          <div className="auth-calendar-toolbar">
            <CalendarSelect label="Month" value={viewDate.getMonth()} options={MONTHS} open={openSelect === 'month'} onToggle={() => setOpenSelect((current) => current === 'month' ? null : 'month')} isDisabled={isUnderageMonth} onChange={(month) => { setViewDate(clampViewDate(new Date(viewDate.getFullYear(), month, 1))); setOpenSelect(null) }} />
            <CalendarSelect label="Year" value={years.indexOf(viewDate.getFullYear())} options={years.map(String)} open={openSelect === 'year'} onToggle={() => setOpenSelect((current) => current === 'year' ? null : 'year')} onChange={(yearIndex) => { setViewDate(clampViewDate(new Date(years[yearIndex], viewDate.getMonth(), 1))); setOpenSelect(null) }} />
            <button type="button" aria-label="Previous month" disabled={atMinMonth} onClick={() => setViewDate(clampViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)))}><ChevronBackOutlineIcon size={18} /></button>
            <button type="button" aria-label="Next month" disabled={atMaxMonth} onClick={() => setViewDate(clampViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)))}><ChevronForwardOutlineIcon size={18} /></button>
          </div>
          <div className="auth-calendar-grid" role="grid">
            {WEEKDAYS.map((weekday) => <span key={weekday} className="auth-calendar-weekday">{weekday}</span>)}
            {days.map((day, index) => day ? (
              <button key={day} type="button" role="gridcell" aria-selected={isSelected(day)} disabled={isUnderageDay(day)} onClick={() => selectDate(day)} className={`auth-calendar-day ${isSelected(day) ? 'auth-calendar-day-selected' : ''}`}>{day}</button>
            ) : <span key={`empty-${index}`} aria-hidden="true" />)}
          </div>
          <div className="auth-calendar-actions">
            <button type="button" onClick={() => { setText(''); onChange(''); onTypedInvalid(false); closeCalendar() }}>Clear</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SignUpPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ displayName: '', email: '', dateOfBirth: '', nationality: '', password: '', confirmPassword: '', bio: '', acceptedTerms: false })
  const [error, setError] = useState<string | null>(null)
  const [confirmEmail, setConfirmEmail] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [oauthError, setOauthError] = useState<string | null>(null)
  const [dobTypedInvalid, setDobTypedInvalid] = useState(false)

  const maxBirthDate = (() => {
    const now = new Date()
    return new Date(now.getFullYear() - 18, now.getMonth(), now.getDate())
  })()
  const passwordRules = useMemo(() => [
    ['At least 8 characters', form.password.length >= 8],
    ['One uppercase letter', /[A-Z]/.test(form.password)],
    ['One number', /\d/.test(form.password)],
  ] as const, [form.password])
  const passwordValid = passwordRules.every(([, valid]) => valid)
  const confirmValid = form.confirmPassword.length > 0 && form.password === form.confirmPassword
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
  const isUnderage = Boolean(form.dateOfBirth) && new Date(`${form.dateOfBirth}T00:00:00`) > maxBirthDate
  const fieldError = (message: string) => <span className="auth-field-error" role="alert">{message}</span>
  const update = (field: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    setBusy(true)
    setError(null)
    if (!form.displayName || !emailValid || !form.dateOfBirth || isUnderage || !form.nationality || !passwordValid || !confirmValid || !form.acceptedTerms) {
      setBusy(false)
      return
    }
    try {
      const { needsConfirmation } = await auth.signUp({
        email: form.email, password: form.password, displayName: form.displayName,
        nationality: form.nationality, bio: form.bio,
      })
      if (needsConfirmation) setConfirmEmail(true)
      else navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign up failed.')
    } finally {
      setBusy(false)
    }
  }

  // One border state per field, so error/success never compete with the neutral border.
  type FieldState = 'error' | 'success' | 'neutral'
  const border: Record<FieldState, string> = { error: 'border-danger', success: 'border-sage-deep', neutral: 'border-ivory-line' }
  const fieldClass = (state: FieldState) =>
    `mt-2 h-14 w-full rounded-xl border bg-ivory-deep px-4 text-base text-ink outline-none placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${border[state]}`
  const inputClass = (invalid: boolean) => fieldClass(invalid ? 'error' : 'neutral')
  // Live match feedback once a confirmation is typed; submit errors win.
  const matchState = (invalid: boolean): FieldState =>
    invalid ? 'error' : form.confirmPassword ? (confirmValid ? 'success' : 'error') : 'neutral'

  return (
    // UI Redesign #4: same photo band and theme-following sheet as Login.
    <AuthScreen>
      <div className="auth-signup">
          {confirmEmail ? (
            <p role="status" className="rounded-2xl border border-ivory-line bg-sage-soft p-4 text-center text-ink">Check <strong>{form.email}</strong> for a confirmation link, then sign in.</p>
          ) : (
            <>
              {/* Form header */}
              <h1 className="text-center font-display text-[2.25rem] leading-[1.15] font-bold tracking-tight text-ink">Create Account</h1>
              <p className="mt-1 text-center text-ink-muted">Get started.</p>
              {auth.mode === 'dev' && <div className="mt-4"><DevSignIn tone="notice" /></div>}

              {/* Registration form */}
              <form onSubmit={submit} noValidate className="mt-7 space-y-4">
                <label className="auth-label block">Full name <span aria-hidden="true">*</span>
                  <input required maxLength={60} autoComplete="name" value={form.displayName} onChange={(e) => update('displayName', e.target.value)} className={inputClass(submitted && !form.displayName)} aria-invalid={submitted && !form.displayName} />
                  {submitted && !form.displayName && fieldError('Full name is required.')}
                </label>
                <label className="auth-label block">Email <span aria-hidden="true">*</span>
                  <input type="email" autoComplete="email" required value={form.email} onChange={(e) => update('email', e.target.value)} className={inputClass(submitted && !emailValid)} aria-invalid={submitted && !emailValid} />
                  {submitted && !emailValid && fieldError(form.email ? 'Enter a valid email address.' : 'Email is required.')}
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* A div, not a <label>: the field holds both the text input and the calendar button. */}
                  <div>
                    <label htmlFor="signup-dob" className="auth-label block">Date of birth <span aria-hidden="true">*</span></label>
                    <CustomDatePicker id="signup-dob" value={form.dateOfBirth} onChange={(value) => update('dateOfBirth', value)} onTypedInvalid={setDobTypedInvalid} invalid={submitted && (!form.dateOfBirth || isUnderage)} describedBy={submitted && (!form.dateOfBirth || isUnderage) ? 'signup-dob-error' : undefined} />
                    <input type="text" className="sr-only" tabIndex={-1} aria-hidden="true" name="dateOfBirth" value={form.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} />
                    {submitted && !form.dateOfBirth && <span id="signup-dob-error">{fieldError(dobTypedInvalid ? 'Enter a real date as mm/dd/yyyy.' : 'Date of birth is required.')}</span>}
                    {submitted && isUnderage && <span id="signup-dob-error">{fieldError('You must be at least 18 to create an account.')}</span>}
                  </div>
                  <label className="auth-label block">Nationality <span aria-hidden="true">*</span>
                    <input required autoComplete="country-name" value={form.nationality} onChange={(e) => update('nationality', e.target.value)} className={inputClass(submitted && !form.nationality)} aria-invalid={submitted && !form.nationality} />
                    {submitted && !form.nationality && fieldError('Nationality is required.')}
                  </label>
                </div>
                <label className="auth-label block">Password <span aria-hidden="true">*</span>
                  <span className="relative block">
                    <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" required value={form.password} onChange={(e) => update('password', e.target.value)} className={`${fieldClass(matchState(submitted && !passwordValid))} pr-12`} aria-invalid={submitted && !passwordValid} />
                    <button type="button" className="touch-target absolute top-2 right-1 flex items-center justify-center rounded-full text-ink-muted focus-visible:outline-2 focus-visible:outline-navy" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOffOutlineIcon size={20} /> : <EyeOutlineIcon size={20} />}</button>
                  </span>
                  <span className="mt-2 grid gap-1 text-xs" aria-live="polite">
                    {passwordRules.map(([label, valid]) => <span key={label} className={`flex items-center gap-1 ${valid ? 'font-semibold text-sage-deep' : 'text-ink-muted'}`}>{valid ? <CheckmarkIcon size={14} /> : <CloseOutlineIcon size={14} />}{label}</span>)}
                  </span>
                </label>
                <label className="auth-label block">Confirm password <span aria-hidden="true">*</span>
                  <span className="relative block">
                    <input type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" required value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} className={`${fieldClass(matchState(submitted && !confirmValid))} pr-12`} aria-invalid={submitted && !confirmValid} />
                    <button type="button" className="touch-target absolute top-2 right-1 flex items-center justify-center rounded-full text-ink-muted focus-visible:outline-2 focus-visible:outline-navy" aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'} onClick={() => setShowConfirmPassword((visible) => !visible)}>{showConfirmPassword ? <EyeOffOutlineIcon size={20} /> : <EyeOutlineIcon size={20} />}</button>
                  </span>
                  {form.confirmPassword && <span className={`auth-password-status mt-1 block ${confirmValid ? 'text-sage-deep' : 'text-danger'}`}>{confirmValid ? 'Passwords match' : 'Passwords do not match'}</span>}
                </label>
                <label className="auth-label block">Bio <span className="font-normal text-ink-muted">(optional)</span>
                  <textarea maxLength={240} value={form.bio} onChange={(e) => update('bio', e.target.value)} className="mt-2 min-h-20 w-full rounded-xl border border-ivory-line bg-ivory-deep p-4 text-base text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy" />
                </label>
                <label className="flex min-h-12 items-center gap-3 text-sm text-ink-body">
                  <input type="checkbox" checked={form.acceptedTerms} onChange={(e) => update('acceptedTerms', e.target.checked)} className={`auth-terms-checkbox size-5 shrink-0 accent-navy ${submitted && !form.acceptedTerms ? 'auth-terms-checkbox-invalid' : ''}`} />
                  <span>I agree to the <a href="/terms" target="_blank" rel="noreferrer" className="font-semibold text-navy underline">Terms</a> and <a href="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-navy underline">Privacy Policy</a>. <span aria-hidden="true">*</span></span>
                </label>
                {submitted && !form.acceptedTerms && <p className="text-sm font-semibold text-danger" role="alert">You must accept the Terms and Privacy Policy.</p>}
                {error && <p role="alert" className="rounded-xl border border-danger-line bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</p>}

                {/* Primary action */}
                <button type="submit" disabled={busy} className="min-h-14 w-full rounded-xl bg-navy text-base font-bold text-on-navy shadow-navy transition-colors hover:bg-navy-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:opacity-60">{busy ? 'Creating account…' : 'Create account'}</button>
              </form>

              {/* Secondary authentication option */}
              <div className="my-5 flex items-center gap-3 text-xs font-semibold text-ink-muted"><span className="h-px flex-1 bg-ivory-line" />OR<span className="h-px flex-1 bg-ivory-line" /></div>
              <button type="button" disabled={auth.mode === 'dev' || busy} onClick={() => { setOauthError(null); void auth.signInWithGoogle().catch((e) => setOauthError(e instanceof Error ? e.message : 'Google sign-up failed.')) }} className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl border border-ivory-line bg-ivory-surface font-semibold text-ink transition-colors hover:bg-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:opacity-60">
                <GoogleIcon />
                Continue with Google
              </button>
              {oauthError && <p role="alert" className="mt-2 text-center text-sm font-semibold text-danger">{oauthError}</p>}
            </>
          )}

          {/* Sign-in footer */}
          <p className="mt-4 flex flex-wrap items-center justify-center gap-x-1.5 text-sm text-ink-muted">Already have an account? <Link to="/login" className="flex min-h-12 items-center rounded-lg font-bold text-navy underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-navy">Sign in</Link></p>
      </div>
    </AuthScreen>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.35 12.27c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.26Z" />
      <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.74 9.74 0 0 0 12 21.75Z" />
      <path fill="#FBBC05" d="M6.54 13.83a5.86 5.86 0 0 1 0-3.66V7.64H3.3a9.75 9.75 0 0 0 0 8.72l3.24-2.53Z" />
      <path fill="#EA4335" d="M12 6.14c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 3.22 14.63 2.25 12 2.25a9.74 9.74 0 0 0-8.7 5.39l3.24 2.53C7.31 7.86 9.46 6.14 12 6.14Z" />
    </svg>
  )
}
