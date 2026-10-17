import { useRegisterSW } from 'virtual:pwa-register/react'

/** Offers to reload when a new version of the PWA has been downloaded. */
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null
  return (
    <div role="alert" className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-cream p-4 text-maroon shadow-xl">
      <span className="text-sm font-semibold">A new version of Laag ta bAI is ready.</span>
      <div className="flex gap-2">
        <button type="button" className="touch-target rounded-xl px-3 text-sm font-bold" onClick={() => setNeedRefresh(false)}>
          Later
        </button>
        <button type="button" className="touch-target rounded-xl bg-maroon px-3 text-sm font-bold text-cream" onClick={() => updateServiceWorker(true)}>
          Reload
        </button>
      </div>
    </div>
  )
}
