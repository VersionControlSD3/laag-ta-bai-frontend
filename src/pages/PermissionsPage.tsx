import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { GRANTED_KEY } from '@/hooks/useGeolocation'
import { useT } from '@/i18n'
import { writeJson } from '@/lib/storage'
import {
  CameraOutlineIcon,
  LocationIcon,
  LockClosedIcon,
  RadioButtonOffIcon,
  RadioButtonOnIcon,
  ShieldCheckmarkOutlineIcon,
} from '@/components/icons/ionicons'

type PermissionId = 'camera' | 'location'
/** 'dismissed': the prompt was closed without a choice, so the browser will ask again. */
type Result = 'granted' | 'denied' | 'dismissed'

// Notifications are asked in context later (a prompt needs a fresh tap); photos need no permission on the web.
// Titles and benefits are in `t.onboarding.permissions`, keyed by id.
const PERMISSIONS: { id: PermissionId; Icon: typeof CameraOutlineIcon }[] = [
  { id: 'camera', Icon: CameraOutlineIcon },
  { id: 'location', Icon: LocationIcon },
]

const PILL: Record<Result, { label: 'allowed' | 'blocked' | 'notNow'; className: string }> = {
  granted: { label: 'allowed', className: 'bg-sage-soft text-sage-deep' },
  denied: { label: 'blocked', className: 'bg-terracotta-soft text-terracotta-ink' },
  dismissed: { label: 'notNow', className: 'bg-navy-soft text-navy' },
}

function attempt(id: PermissionId): Promise<boolean> {
  if (id === 'camera') {
    // mediaDevices is missing outside secure contexts.
    if (!navigator.mediaDevices) return Promise.resolve(false)
    return navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        stream.getTracks().forEach((track) => track.stop())
        return true
      })
      .catch(() => false)
  }
  if (!('geolocation' in navigator)) return Promise.resolve(false)
  writeJson(GRANTED_KEY, true)
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => resolve(false),
      { timeout: 10_000 },
    ),
  )
}

async function ask(id: PermissionId): Promise<Result> {
  if (await attempt(id)) return 'granted'
  // Both APIs fail the same way for "blocked" and "closed the prompt"; the permission state tells them apart.
  const state = await navigator.permissions
    ?.query({ name: id === 'camera' ? ('camera' as PermissionName) : 'geolocation' })
    .then((status) => status.state)
    .catch(() => undefined)
  // 'granted' here means the permission is fine but the device failed (e.g. a location timeout).
  return state === 'prompt' ? 'dismissed' : state === 'granted' ? 'granted' : 'denied'
}

/** Asks for device permissions after onboarding, explaining what each one unlocks. */
export default function PermissionsPage() {
  const navigate = useNavigate()
  const p = useT().onboarding.permissions
  const title = (id: PermissionId) => p[id]
  const next = (useLocation().state as { next?: string } | null)?.next ?? '/'
  const [selected, setSelected] = useState<Record<PermissionId, boolean>>({ camera: true, location: true })
  const [results, setResults] = useState<Partial<Record<PermissionId, Result>> | null>(null)
  const [asking, setAsking] = useState(false)

  const finish = () => navigate(next, { replace: true })

  const request = async (ids: PermissionId[]) => {
    setAsking(true)
    const outcome: Partial<Record<PermissionId, Result>> = { ...results }
    // One at a time so browser prompts don't stack.
    for (const id of ids) outcome[id] = await ask(id)
    setAsking(false)
    if (Object.values(outcome).every((r) => r === 'granted')) return finish()
    setResults(outcome)
  }

  const missing = PERMISSIONS.filter((m) => results?.[m.id] && results[m.id] !== 'granted')
  const anyGranted = PERMISSIONS.some((m) => results?.[m.id] === 'granted')
  const copy = !results
    ? {
        eyebrow: p.readyEyebrow,
        title: p.readyTitle,
        body: p.readyBody,
      }
    : anyGranted
      ? {
          eyebrow: p.okEyebrow,
          title: p.almostTitle,
          body: p.almostBody(missing.map((m) => title(m.id))),
        }
      : {
          eyebrow: p.okEyebrow,
          title: p.noWorriesTitle,
          body: p.noWorriesBody,
        }

  const frame = 'flex w-full items-center gap-4 rounded-2xl bg-ivory-surface p-4'
  const row = (perm: (typeof PERMISSIONS)[number]) => {
    const result = results?.[perm.id]
    const on = selected[perm.id]
    const body = (
      <>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sage-soft">
          <perm.Icon className="text-sage-deep" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1 text-left">
          <span className="text-lg leading-7 font-bold text-ink">{title(perm.id)}</span>
          <span className="text-sm leading-5 text-ink-muted">{p[`${perm.id}Benefit`]}</span>
        </span>
      </>
    )

    if (results) {
      return (
        <li key={perm.id} className={`${frame} border border-ivory-line`}>
          {body}
          {result && (
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${PILL[result].className}`}>
              {p[PILL[result].label]}
            </span>
          )}
        </li>
      )
    }
    return (
      <li key={perm.id}>
        <button
          type="button"
          role="checkbox"
          aria-checked={on}
          onClick={() => setSelected((s) => ({ ...s, [perm.id]: !s[perm.id] }))}
          className={`${frame} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
            on
              ? 'border-[1.5px] border-navy'
              : 'border border-ivory-line'
          }`}
        >
          {body}
          {on ? <RadioButtonOnIcon className="shrink-0 text-navy" /> : <RadioButtonOffIcon className="shrink-0 text-ink-muted" />}
        </button>
      </li>
    )
  }

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col bg-linear-to-b from-ivory to-ivory-deep">
      <main className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 pt-12 pb-4" aria-live="polite">
        <header className="flex flex-col items-center gap-3 text-center">
          <span className="mb-1 flex size-18 items-center justify-center rounded-full bg-navy-soft">
            <ShieldCheckmarkOutlineIcon size={36} className="text-navy" />
          </span>
          <p className="text-xs leading-4 font-bold tracking-[0.1em] text-terracotta-ink">
            {copy.eyebrow}
          </p>
          <h1 className="text-[2rem] leading-[2.375rem] font-extrabold tracking-tight text-ink">
            {copy.title}
          </h1>
          <p className="max-w-[330px] leading-6 text-ink-body">{copy.body}</p>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="pl-2 text-xs leading-4 font-bold tracking-[0.1em] text-terracotta-ink">
            {p.needed}
          </h2>
          <ul className="flex flex-col gap-3">{PERMISSIONS.map(row)}</ul>
        </section>

        <p className="flex gap-3 px-2 text-sm leading-5 text-ink-muted">
          <LockClosedIcon size={16} className="mt-0.5 shrink-0 self-start" />
          {results
            ? p.turnOn
            : p.privacy}
        </p>
      </main>

      {/* Actions stay pinned so they are visible on small screens while the list scrolls. */}
      <footer
        className="flex shrink-0 flex-col items-center gap-2 px-6 pt-2"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          disabled={asking}
          onClick={() => (results ? finish() : request(PERMISSIONS.filter((m) => selected[m.id]).map((m) => m.id)))}
          className="h-14 w-full rounded-xl bg-navy px-6 text-lg leading-7 font-bold tracking-[0.05em] text-on-navy shadow-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy active:bg-navy-pressed disabled:opacity-80"
        >
          {asking ? p.asking : results ? p.continue : p.allow}
        </button>
        <button
          type="button"
          disabled={asking}
          onClick={() => (results ? request(missing.map((m) => m.id)) : finish())}
          className="touch-target px-4 py-3 text-sm leading-5 font-bold text-terracotta-ink underline focus-visible:outline-2 focus-visible:outline-navy"
        >
          {results ? p.tryAgain : p.later}
        </button>
      </footer>
    </div>
  )
}
