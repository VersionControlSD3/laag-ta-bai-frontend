import { Link } from 'react-router'
import { useT } from '@/i18n'

export default function NotFoundPage() {
  const t = useT()
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-ivory px-6 text-center text-ink">
      <p className="text-5xl leading-none font-extrabold text-terracotta">404</p>
      <p className="text-lg leading-6 font-bold text-ink">{t.common.notFound.message}</p>
      <Link
        to="/"
        className="touch-target flex min-h-12 items-center justify-center rounded-2xl bg-navy px-7 py-3.5 text-[0.9375rem] leading-5 font-bold tracking-[0.04em] text-on-navy shadow-navy transition-colors hover:bg-navy-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
      >
        {t.common.backToExplore}
      </Link>
    </div>
  )
}
