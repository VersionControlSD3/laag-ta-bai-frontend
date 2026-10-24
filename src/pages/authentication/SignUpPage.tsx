import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff, MapPin, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '@/features/auth/AuthContext'
import './SignUpPage.css'

function DevSignIn() {
  const auth = useAuth()
  const navigate = useNavigate()
  return (
    <div className="rounded-2xl border border-dashed border-terracotta/60 bg-design-surface p-4 text-sm">
      <p className="font-semibold">Supabase isn't configured.</p>
      <p className="mt-1 text-ink-muted">
        Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> for real accounts, or continue as a local
        test user (works with the API in memory mode).
      </p>
      <button type="button" onClick={() => { auth.signInAsDev(); navigate('/') }} className="touch-target mt-3 w-full rounded-2xl bg-navy font-bold text-ivory">
        Continue as dev traveler
      </button>
    </div>
  )
}

// Custom calendar controls keep the date picker consistent across browsers.
const MONTHS = Array.from({ length: 12 }, (_, month) => new Date(2000, month, 1).toLocaleString('en-US', { month: 'long' }))
const WEEKDAYS = ['S', 'M', 'T', 'W', 'Th', 'F', 'S']

function formatDate(value: string) {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  return `${month}/${day}/${year}`
}

function CalendarSelect({ label, value, options, open, onToggle, onChange }: { label: string; value: number; options: string[]; open: boolean; onToggle: () => void; onChange: (value: number) => void }) {
  return (
    <div className="auth-calendar-select">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={onToggle} className="auth-calendar-select-button">
        <span>{options[value]}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className={`auth-calendar-select-menu ${label === 'Month' ? 'auth-calendar-select-menu-month' : 'auth-calendar-select-menu-year'}`}>
          <div className="auth-calendar-select-scroll" role="listbox" aria-label={label}>
            {options.map((option, index) => (
              <button key={option} type="button" role="option" aria-selected={index === value} className={index === value ? 'auth-calendar-select-option auth-calendar-select-option-selected' : 'auth-calendar-select-option'} onClick={() => onChange(index)}>
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CustomDatePicker({ value, onChange, invalid }: { value: string; onChange: (value: string) => void; invalid: boolean }) {
  const today = new Date()
  const selected = value ? new Date(`${value}T00:00:00`) : null
  const pickerRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [openSelect, setOpenSelect] = useState<'month' | 'year' | null>(null)
  const [openAbove, setOpenAbove] = useState(false)
  const [viewDate, setViewDate] = useState(() => selected ?? new Date(today.getFullYear() - 18, today.getMonth(), 1))
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay()
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate()
  const days = Array.from({ length: firstDay + daysInMonth }, (_, index) => index < firstDay ? null : index - firstDay + 1)
  const years = Array.from({ length: 101 }, (_, index) => today.getFullYear() - index)
  const selectDate = (day: number) => {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onChange(iso)
    setOpen(false)
  }
  const isToday = (day: number) => day === today.getDate() && viewDate.getMonth() === today.getMonth() && viewDate.getFullYear() === today.getFullYear()
  const isSelected = (day: number) => selected?.getDate() === day && selected.getMonth() === viewDate.getMonth() && selected.getFullYear() === viewDate.getFullYear()

  useEffect(() => {
    if (!open) return
    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setOpenSelect(null)
      }
    }
    document.addEventListener('pointerdown', handleOutsidePointerDown)
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    const updateCalendarPlacement = () => {
      const picker = pickerRef.current
      const calendar = calendarRef.current
      if (!picker || !calendar) return
      const pickerRect = picker.getBoundingClientRect()
      const calendarHeight = calendar.getBoundingClientRect().height
      const spacing = 8
      const bottomSpace = window.innerHeight - pickerRect.bottom
      const topSpace = pickerRect.top
      setOpenAbove(bottomSpace < calendarHeight + spacing && topSpace >= calendarHeight + spacing)
    }
    updateCalendarPlacement()
    window.addEventListener('resize', updateCalendarPlacement)
    window.addEventListener('scroll', updateCalendarPlacement, true)
    return () => {
      window.removeEventListener('resize', updateCalendarPlacement)
      window.removeEventListener('scroll', updateCalendarPlacement, true)
    }
  }, [open, openSelect])

  return (
    <div ref={pickerRef} className="relative mt-1">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid}
        aria-label="Choose date of birth"
        onClick={() => {
          if (!open) setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))
          setOpen((current) => !current)
        }}
        className={`auth-date-field ${invalid ? 'auth-date-field-invalid' : ''}`}
      >
        <span className={value ? 'text-ivory' : 'text-ivory'}>{formatDate(value) || 'mm/dd/yyyy'}</span>
        <CalendarDays size={19} aria-hidden="true" />
      </button>
      {open && (
        <div ref={calendarRef} className={`auth-calendar ${openAbove ? 'auth-calendar-above' : ''}`} role="dialog" aria-label="Choose date of birth">
          <div className="auth-calendar-toolbar">
            <CalendarSelect label="Month" value={viewDate.getMonth()} options={MONTHS} open={openSelect === 'month'} onToggle={() => setOpenSelect((current) => current === 'month' ? null : 'month')} onChange={(month) => { setViewDate(new Date(viewDate.getFullYear(), month, 1)); setOpenSelect(null) }} />
            <CalendarSelect label="Year" value={years.indexOf(viewDate.getFullYear())} options={years.map(String)} open={openSelect === 'year'} onToggle={() => setOpenSelect((current) => current === 'year' ? null : 'year')} onChange={(yearIndex) => { setViewDate(new Date(years[yearIndex], viewDate.getMonth(), 1)); setOpenSelect(null) }} />
            <button type="button" aria-label="Previous month" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}><ChevronLeft size={18} /></button>
            <button type="button" aria-label="Next month" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}><ChevronRight size={18} /></button>
          </div>
          <div className="auth-calendar-grid" role="grid">
            {WEEKDAYS.map((weekday) => <span key={weekday} className="auth-calendar-weekday">{weekday}</span>)}
            {days.map((day, index) => day ? (
              <button key={day} type="button" role="gridcell" aria-selected={isSelected(day)} aria-current={isToday(day) ? 'date' : undefined} onClick={() => selectDate(day)} className={`auth-calendar-day ${isSelected(day) ? 'auth-calendar-day-selected' : ''} ${isToday(day) ? 'auth-calendar-day-today' : ''}`}>{day}</button>
            ) : <span key={`empty-${index}`} aria-hidden="true" />)}
          </div>
          <div className="auth-calendar-actions">
            <button type="button" onClick={() => { onChange(''); setOpen(false) }}>Clear</button>
            <button type="button" onClick={() => {
              setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))
              onChange(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`)
              setOpen(false)
            }}>Today</button>
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

  const passwordRules = useMemo(() => [
    ['At least 8 characters', form.password.length >= 8],
    ['One uppercase letter', /[A-Z]/.test(form.password)],
    ['One number', /\d/.test(form.password)],
  ] as const, [form.password])
  const passwordValid = passwordRules.every(([, valid]) => valid)
  const confirmValid = form.confirmPassword.length > 0 && form.password === form.confirmPassword
  const passwordsMatch = form.confirmPassword.length > 0 && form.password === form.confirmPassword
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
  const fieldError = (message: string) => <span className="auth-field-error" role="alert">{message}</span>
  const update = (field: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    setBusy(true)
    setError(null)
    if (!form.displayName || !emailValid || !form.dateOfBirth || !form.nationality || !passwordValid || !confirmValid || !form.acceptedTerms) {
      setBusy(false)
      return
    }
    try {
      const { needsConfirmation } = await auth.signUp({
        email: form.email, password: form.password, displayName: form.displayName,
        dateOfBirth: form.dateOfBirth, nationality: form.nationality, bio: form.bio,
      })
      if (needsConfirmation) setConfirmEmail(true)
      else navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign up failed.')
    } finally {
      setBusy(false)
    }
  }

  const inputClass = (invalid: boolean) =>
    `mt-1 h-12 w-full rounded-xl border bg-design-surface px-4 text-ivory text-base outline-none transition focus:border-terracotta focus:ring-2 focus:ring-terracotta/30 ${invalid ? 'border-error' : 'border-design-line'}`

  return (
    <main className={`auth-signup min-h-dvh bg-cover bg-center bg-fixed ${isDaytime() ? 'auth-signup-day' : 'auth-signup-night'}`}>
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6 sm:px-6">
        {/* Page header */}
        <header className="flex items-center justify-between text-white">
          <Link to="/" className="text-sm font-bold tracking-[0.2em]">Laag ta b<span className="text-terracotta">AI</span></Link>
          <span className="flex items-center gap-1 rounded-full border border-white/30 bg-slate-900/30 px-3 py-2 text-xs font-semibold"><MapPin size={14} /> Cebu, Philippines</span>
        </header>
        <section className="auth-signup-card my-8 flex-1 rounded-[2rem] p-6 sm:p-8">
          {confirmEmail ? (
            <p role="status" className="rounded-2xl border border-design-line bg-design-surface p-4 text-center">Check <strong>{form.email}</strong> for a confirmation link, then sign in.</p>
          ) : (
            <>
              {/* Form header */}
              <h1 className="auth-signup-heading text-center text-3xl font-extrabold">Create Account</h1>
              <p className="mt-2 text-center text-ivory">Get started.</p>
              {auth.mode === 'dev' && <div className="mt-4"><DevSignIn /></div>}

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
                  <label className="auth-label block">Date of birth <span aria-hidden="true">*</span>
                    <CustomDatePicker value={form.dateOfBirth} onChange={(value) => update('dateOfBirth', value)} invalid={submitted && !form.dateOfBirth} />
                    {submitted && !form.dateOfBirth && fieldError('Date of birth is required.')}
                  </label>
                  <label className="auth-label block">Nationality <span aria-hidden="true">*</span>
                    <input required autoComplete="country-name" value={form.nationality} onChange={(e) => update('nationality', e.target.value)} className={inputClass(submitted && !form.nationality)} aria-invalid={submitted && !form.nationality} />
                    {submitted && !form.nationality && fieldError('Nationality is required.')}
                  </label>
                </div>
                <label className="auth-label block">Password <span aria-hidden="true">*</span>
                  <span className="relative block">
                    <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" required value={form.password} onChange={(e) => update('password', e.target.value)} className={`${inputClass(submitted && !passwordValid)} ${form.confirmPassword ? (passwordsMatch ? 'border-success' : 'border-error') : ''} pr-12`} aria-invalid={submitted && !passwordValid} />
                    <button type="button" className="touch-target absolute right-0 top-1 flex items-center px-3" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                  </span>
                  <span className="mt-2 grid gap-1 text-[8px]" aria-live="polite">
                    {passwordRules.map(([label, valid]) => <span key={label} className={valid ? 'text-success' : 'text-ivory'}>{valid ? <Check size={14} className="mr-1 inline" /> : <X size={14} className="mr-1 inline" />}{label}</span>)}
                  </span>
                </label>
                <label className="auth-label block">Confirm password <span aria-hidden="true">*</span>
                  <span className="relative block">
                    <input type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" required value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} className={`${inputClass(submitted && !confirmValid)} ${form.confirmPassword ? (passwordsMatch ? 'border-success' : 'border-error') : ''} pr-12`} aria-invalid={submitted && !confirmValid} />
                    <button type="button" className="touch-target absolute right-0 top-1 flex items-center px-3" aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'} onClick={() => setShowConfirmPassword((visible) => !visible)}>{showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                  </span>
                  {form.confirmPassword && <span className={`auth-password-status mt-1 block ${confirmValid ? 'text-success' : 'text-error'}`}>{confirmValid ? 'Passwords match' : 'Passwords do not match'}</span>}
                </label>
                <label className="auth-label block">Bio <span className="text-ivory">(optional)</span>
                  <textarea maxLength={240} value={form.bio} onChange={(e) => update('bio', e.target.value)} className="mt-1 min-h-16 w-full rounded-xl border border-design-line bg-design-surface p-3 text-ivory text-base outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/30" />
                </label>
                <label className="flex gap-3 text-sm text-terracotta">
                  <input type="checkbox" checked={form.acceptedTerms} onChange={(e) => update('acceptedTerms', e.target.checked)} className={`auth-terms-checkbox mt-1 h-5 w-5 accent-primary ${submitted && !form.acceptedTerms ? 'auth-terms-checkbox-invalid' : ''}`} />
                  <span>I agree to the <a href="/terms" className="font-semibold underline">Terms</a> and <a href="/privacy" className="font-semibold underline">Privacy Policy</a>. <span aria-hidden="true">*</span></span>
                </label>
                {submitted && !form.acceptedTerms && <p className="text-xs text-error" role="alert">You must accept the Terms and Privacy Policy.</p>}
                {error && <p role="alert" className="text-sm font-semibold text-error">{error}</p>}

                {/* Primary action */}
                <button type="submit" disabled={busy} className="touch-target w-full rounded-xl bg-terracotta font-bold tracking-wide text-ivory disabled:opacity-60">{busy ? 'Creating account…' : 'Create account'}</button>
              </form>

              {/* Secondary authentication option */}
              <div className="my-5 flex items-center gap-3 text-xs text-ivory"><span className="h-px flex-1 bg-design-line" />OR<span className="h-px flex-1 bg-design-line" /></div>
              <button type="button" disabled={auth.mode === 'dev' || busy} onClick={() => { setOauthError(null); void auth.signUpWithGoogle().catch((e) => setOauthError(e instanceof Error ? e.message : 'Google sign-up failed.')) }} className="auth-google-button touch-target flex w-full items-center justify-center gap-3 rounded-lg font-semibold disabled:opacity-60">
                <GoogleIcon />
                Continue with Google
              </button>
              {oauthError && <p role="alert" className="mt-2 text-center text-xs text-error">{oauthError}</p>}
            </>
          )}

          {/* Sign-in footer */}
          <p className="mt-6 text-center text-sm text-ivory">Already have an account? <Link to="/login" className="font-bold text-terracotta underline">Sign in</Link></p>
        </section>
      </div>
    </main>
  )
}

function isDaytime() {
  const hour = new Date().getHours()
  return hour >= 6 && hour < 18
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
