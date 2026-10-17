import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-6xl font-extrabold text-primary">404</p>
      <p className="text-lg font-semibold">Na-laag ka, bai! This page doesn't exist.</p>
      <Link to="/" className="touch-target flex items-center rounded-2xl bg-primary px-6 font-bold text-on-primary">Back to Explore</Link>
    </div>
  )
}
