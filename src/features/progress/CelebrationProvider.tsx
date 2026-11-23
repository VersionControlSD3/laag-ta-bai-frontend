import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { ProgressUpdate } from '@/api/types'
import { RibbonIcon, TrophyIcon } from '@/components/icons/ionicons'
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
          data-palette="light"
          role="status"
          className="fixed left-1/2 top-6 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-[0.9375rem] leading-5 font-bold tracking-[0.04em] text-ink shadow-modal"
        >
          <RibbonIcon size={16} aria-hidden />
          <span>{toast}</span>
        </div>
      )}
      {dialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-6 dark:bg-ivory-deep/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="celebrate-title"
        >
          <div className="flex w-full max-w-sm animate-[pulse_1s_ease-in-out_1] flex-col items-center gap-3 rounded-[28px] border border-ivory-line bg-ivory-surface px-6 py-7 text-center text-ink shadow-modal motion-reduce:animate-none">
            <div data-palette="light" className="flex size-16 items-center justify-center rounded-full bg-gold text-ink">
              <TrophyIcon size={30} aria-hidden />
            </div>
            <h2 id="celebrate-title" className="text-3xl leading-9 font-extrabold tracking-tight text-ink">
              {dialog.leveledUp ? `Level ${dialog.rank.level}!` : 'Badge unlocked!'}
            </h2>
            {dialog.leveledUp && (
              <p className="text-[0.9375rem] leading-[1.375rem] font-bold text-ink-body">
                You are now a {dialog.rank.title}.
              </p>
            )}
            {dialog.newBadges.map((badge) => (
              <p
                key={badge}
                className="inline-flex items-center gap-1.5 rounded-xl bg-terracotta-soft px-4 py-2 text-xs leading-4 font-bold text-terracotta-ink"
              >
                <RibbonIcon size={14} aria-hidden />
                <span>{badge} Unlocked</span>
              </p>
            ))}
            {dialog.xpAwarded > 0 && <p className="font-mono text-xs leading-4 font-bold text-ink-muted">+{dialog.xpAwarded} XP</p>}
            <button
              type="button"
              onClick={() => setDialog(null)}
              className="touch-target mt-2 flex min-h-12 w-full items-center justify-center rounded-2xl bg-navy px-4 py-3.5 text-[0.9375rem] leading-5 font-bold tracking-[0.04em] text-on-navy shadow-navy transition-colors hover:bg-navy-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              Padayon! (Continue)
            </button>
          </div>
        </div>
      )}
    </CelebrationContext.Provider>
  )
}
