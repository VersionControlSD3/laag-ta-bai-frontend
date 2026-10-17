import type { ReactNode } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-10 text-muted">
      <Loader2 className="animate-spin" size={20} aria-hidden /> {label}
    </div>
  )
}

export function ErrorMessage({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Something went wrong.'
  return (
    <div role="alert" className="mx-5 my-6 rounded-2xl border border-crimson/40 bg-crimson/10 p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold">
        <AlertCircle size={18} aria-hidden /> {message}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="touch-target mt-2 font-bold text-primary underline">
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="mx-5 flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface p-8 text-center">
      <div className="text-primary">{icon}</div>
      <p className="font-bold">{title}</p>
      {children && <div className="text-sm text-muted">{children}</div>}
    </div>
  )
}
