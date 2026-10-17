import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Award, PartyPopper, Sparkles } from 'lucide-react'
import type { ProgressUpdate } from '@/api/types'
import { CelebrationContext } from './CelebrationContext'

/**
 * Shows XP toasts and level-up / badge dialogs (SRS 3.1.3.1.c, 3.2.3.2),
 * with a short vibration as a haptic cue where supported.
 */
export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<string | null>(null)
  const [dialog, setDialog] = useState<ProgressUpdate | null>(null)

  const celebrate = useCallback((progress: ProgressUpdate | null | undefined) => {
    if (!progress) return
    if (progress.leveledUp || progress.newBadges.length > 0) {
      navigator.vibrate?.([60, 40, 120])
      setDialog(progress)
    } else if (progress.xpAwarded > 0) {
      navigator.vibrate?.(40)
      setToast(`+${progress.xpAwarded} XP`)
      window.setTimeout(() => setToast(null), 2200)
    }
  }, [])

  const value = useMemo(() => ({ celebrate }), [celebrate])

  return (
    <CelebrationContext.Provider value={value}>
      {children}
      {toast && (
        <div
          role="status"
          className="fixed left-1/2 top-6 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-gold px-5 py-2 font-bold text-maroon shadow-lg"
        >
          <Sparkles size={18} aria-hidden /> {toast}
        </div>
      )}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" role="dialog" aria-modal="true" aria-labelledby="celebrate-title">
          <div className="w-full max-w-sm animate-[pulse_1s_ease-in-out_1] rounded-3xl bg-cream p-6 text-center text-maroon shadow-2xl">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gold">
              {dialog.newBadges.length ? <Award size={32} aria-hidden /> : <PartyPopper size={32} aria-hidden />}
            </div>
            <h2 id="celebrate-title" className="text-2xl font-extrabold">
              {dialog.leveledUp ? `Level ${dialog.rank.level}!` : 'Badge unlocked!'}
            </h2>
            {dialog.leveledUp && <p className="mt-1 font-semibold">You are now a {dialog.rank.title}.</p>}
            {dialog.newBadges.map((badge) => (
              <p key={badge} className="mt-2 rounded-xl bg-maroon/10 px-3 py-2 font-bold">
                🏅 {badge}
              </p>
            ))}
            {dialog.xpAwarded > 0 && <p className="mt-2 text-sm">+{dialog.xpAwarded} XP</p>}
            <button
              type="button"
              onClick={() => setDialog(null)}
              className="touch-target mt-5 w-full rounded-2xl bg-maroon px-4 font-bold text-cream"
            >
              Padayon! (Continue)
            </button>
          </div>
        </div>
      )}
    </CelebrationContext.Provider>
  )
}
