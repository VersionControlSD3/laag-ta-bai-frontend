import type { ReactNode } from 'react'
import { ArrowBackIcon } from '@/components/icons/ionicons'
import { useBack } from '@/hooks/useBack'

export const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy'

/**
 * Figma "Laag ta bAI/TopNavbar" (151:114): back, centred navy title, optional action, 40 px bottom
 * corners, 60 px + safe-area inset. Without an action an empty slot keeps the title centred.
 * px-5 puts the 48 px targets' icons where Figma's 40 px buttons with 24 px padding put them.
 */
export function TopNavbar({
  title,
  action,
  onBack,
  backLabel = 'Go back',
  titleAs: Title = 'p',
}: {
  title: string
  action?: ReactNode
  onBack?: () => void
  backLabel?: string
  titleAs?: 'h1' | 'p'
}) {
  const back = useBack()
  return (
    <header className="sticky top-0 z-10 rounded-b-chrome bg-ivory-surface px-5 pt-[env(safe-area-inset-top)] shadow-topbar">
      <div className="flex h-topbar items-center gap-2">
        <button
          type="button"
          onClick={onBack ?? back}
          aria-label={backLabel}
          className={`touch-target flex items-center justify-center rounded-full text-navy ${focus}`}
        >
          <ArrowBackIcon />
        </button>
        <Title className="min-w-0 flex-1 truncate text-center text-[1.375rem] leading-7 font-bold tracking-[0.01em] text-navy">{title}</Title>
        <div className="flex min-w-12 justify-center">{action}</div>
      </div>
    </header>
  )
}
