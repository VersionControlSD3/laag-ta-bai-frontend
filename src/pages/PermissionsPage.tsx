import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { GRANTED_KEY } from '@/hooks/useGeolocation'
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
const PERMISSIONS: { id: PermissionId; title: string; benefit: string; Icon: typeof CameraOutlineIcon }[] = [
  { id: 'camera', title: 'Camera', benefit: 'To scan landmarks and hear their stories.', Icon: CameraOutlineIcon },
  { id: 'location', title: 'Location', benefit: 'To show the landmarks around you.', Icon: LocationIcon },
]

const PILL: Record<Result, { label: string; className: string }> = {
  granted: { label: 'Allowed', className: 'bg-sage-soft text-sage-deep' },
  denied: { label: 'Blocked', className: 'bg-terracotta-soft text-terracotta-ink' },
  dismissed: { label: 'Not now', className: 'bg-navy-soft text-navy' },
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

  const missing = PERMISSIONS.filter((p) => results?.[p.id] && results[p.id] !== 'granted')
  const anyGranted = PERMISSIONS.some((p) => results?.[p.id] === 'granted')
  const copy = !results
    ? {
        eyebrow: 'ANDAM NA KA?',
        title: 'Ready to explore?',
        body: "bAI needs a few permissions to scan landmarks and show you what's nearby.",
      }
    : anyGranted
      ? {
          eyebrow: 'SIGE LANG',
          title: 'Almost set',
          body: `${missing.map((p) => p.title).join(' and ')} isn't on yet. You can still explore and turn it on later.`,
        }
      : {
          eyebrow: 'SIGE LANG',
          title: 'No worries',
          body: 'You can still browse landmarks and their stories. Turn permissions on whenever you like.',
        }

  const frame = 'flex w-full items-center gap-4 rounded-2xl bg-ivory-surface p-4'
  const row = (p: (typeof PERMISSIONS)[number]) => {
    const result = results?.[p.id]
    const on = selected[p.id]
    const body = (
      <>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sage-soft">
          <p.Icon className="text-sage-deep" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1 text-left">
          <span className="text-lg leading-7 font-bold text-ink">{p.title}</span>
          <span className="text-sm leading-5 text-ink-muted">{p.benefit}</span>
        </span>
      </>
    )

    if (results) {
      return (
        <li key={p.id} className={`${frame} border border-ivory-line`}>
          {body}
          {result && (
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${PILL[result].className}`}>
              {PILL[result].label}
            </span>
          )}
        </li>
      )
    }
    return (
      <li key={p.id}>
        <button
          type="button"
          role="checkbox"
          aria-checked={on}
          onClick={() => setSelected((s) => ({ ...s, [p.id]: !s[p.id] }))}
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
            NEEDED TO EXPLORE
          </h2>
          <ul className="flex flex-col gap-3">{PERMISSIONS.map(row)}</ul>
        </section>

        <p className="flex gap-3 px-2 text-sm leading-5 text-ink-muted">
          <LockClosedIcon size={16} className="mt-0.5 shrink-0 self-start" />
          {results
            ? 'To turn one on, allow it for Laag ta bAI in your browser or phone settings, then tap Try again.'
            : 'We use your location only to sort nearby landmarks and verify scans. It is never sold. You can change any of these later in your browser settings.'}
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
          onClick={() => (results ? finish() : request(PERMISSIONS.filter((p) => selected[p.id]).map((p) => p.id)))}
          className="h-14 w-full rounded-xl bg-navy px-6 text-lg leading-7 font-bold tracking-[0.05em] text-on-navy shadow-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy active:bg-navy-pressed disabled:opacity-80"
        >
          {asking ? 'ASKING…' : results ? 'CONTINUE' : 'ALLOW PERMISSIONS'}
        </button>
        <button
          type="button"
          disabled={asking}
          onClick={() => (results ? request(missing.map((p) => p.id)) : finish())}
          className="touch-target px-4 py-3 text-sm leading-5 font-bold text-terracotta-ink underline focus-visible:outline-2 focus-visible:outline-navy"
        >
          {results ? 'Try again' : 'Maybe later'}
        </button>
      </footer>
    </div>
  )
}
