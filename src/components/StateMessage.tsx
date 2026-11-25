import type { ReactNode } from 'react'
import { InformationCircleOutlineIcon } from './icons/ionicons'

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2.5 py-10 text-sm font-medium text-ink-muted">
      <span
        aria-hidden="true"
        className="size-5 animate-spin rounded-full border-2 border-navy/25 border-t-navy motion-reduce:animate-none"
      />
      <span>{label}</span>
    </div>
  )
}

export function ErrorMessage({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Something went wrong.'
  return (
    <div
      role="alert"
      className="mx-5 my-6 rounded-[20px] border border-danger-line bg-danger-soft px-[18px] py-4 text-sm text-danger"
    >
      <p className="flex items-center gap-2 font-bold">
        <InformationCircleOutlineIcon size={18} className="shrink-0" aria-hidden />
        <span>{message}</span>
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="touch-target mt-2 inline-flex min-h-12 items-center text-sm font-bold text-danger underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="mx-5 flex flex-col items-center gap-2 rounded-3xl border border-ivory-line bg-ivory-surface p-8 text-center">
      <div className="text-terracotta">{icon}</div>
      <p className="text-base font-bold text-ink">{title}</p>
      {children && <div className="text-sm text-ink-muted">{children}</div>}
    </div>
  )
}
