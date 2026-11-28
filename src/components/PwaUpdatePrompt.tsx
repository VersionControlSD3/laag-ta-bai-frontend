import { useRegisterSW } from 'virtual:pwa-register/react'
import { useT } from '@/i18n'

/** Offers to reload when a new version of the PWA has been downloaded. */
export function PwaUpdatePrompt() {
  const t = useT()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null
  return (
    <div
      role="alert"
      className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-ivory-line bg-ivory-surface py-3 pr-3.5 pl-4 text-ink shadow-modal"
    >
      <span className="text-xs leading-4 font-bold text-ink">{t.common.pwa.ready}</span>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          className="touch-target flex min-h-12 items-center rounded-[10px] px-3 text-xs leading-4 font-bold text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          onClick={() => setNeedRefresh(false)}
        >
          {t.common.pwa.later}
        </button>
        <button
          type="button"
          className="touch-target flex min-h-12 items-center rounded-[10px] bg-navy px-3.5 text-xs leading-4 font-bold text-on-navy transition-colors hover:bg-navy-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          onClick={() => updateServiceWorker(true)}
        >
          {t.common.pwa.reload}
        </button>
      </div>
    </div>
  )
}
