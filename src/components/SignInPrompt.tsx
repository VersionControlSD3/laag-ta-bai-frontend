import { Link } from 'react-router'
import { LogIn } from 'lucide-react'

export function SignInPrompt({ message }: { message: string }) {
  return (
    <div className="mx-5 flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface p-6 text-center">
      <LogIn className="text-primary" size={32} aria-hidden />
      <p className="font-semibold">{message}</p>
      <Link to="/login" className="touch-target flex items-center rounded-2xl bg-primary px-6 font-bold text-on-primary">
        Sign in
      </Link>
    </div>
  )
}
