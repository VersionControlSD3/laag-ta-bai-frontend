import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { useT } from '@/i18n'

export function PageHeader({ title, subtitle, back, action }: { title: string; subtitle?: string; back?: boolean; action?: ReactNode }) {
  const navigate = useNavigate()
  const t = useT()
  return (
    <header className="pt-safe flex items-center gap-2 px-5 pb-4">
      {back && (
        <button type="button" onClick={() => navigate(-1)} aria-label={t.common.goBack} className="touch-target -ml-3 flex items-center justify-center rounded-full">
          <ArrowLeft aria-hidden />
        </button>
      )}
      <div className={back ? 'flex-1' : 'flex-1 text-center'}>
        <h1 className={`${back ? 'text-2xl' : 'text-4xl'} font-extrabold tracking-tight text-primary`}>{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}
