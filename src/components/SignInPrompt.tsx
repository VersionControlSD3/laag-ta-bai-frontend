import { Link } from 'react-router'
import { LogInOutlineIcon } from './icons/ionicons'

export function SignInPrompt({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-ivory-line bg-ivory-surface p-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-terracotta-soft text-terracotta-ink">
        <LogInOutlineIcon size={24} />
      </span>
      <p className="text-sm font-semibold text-ink-body">{message}</p>
      <Link
        to="/login"
        className="flex min-h-12 w-full items-center justify-center rounded-full bg-navy px-6 text-sm font-bold text-on-navy shadow-navy transition-colors hover:bg-navy-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
      >
        Sign in
      </Link>
    </div>
  )
}
