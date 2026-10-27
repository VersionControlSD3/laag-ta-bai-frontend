import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ArrowBackIcon } from './icons/ionicons'

/**
 * Header for pushed screens, from the Figma TopNavbar component: back arrow, centred navy title,
 * optional right action; surface fill, 40px bottom corners, shadow-topbar, 60px + top inset.
 */
export function TopNavbar({
  title,
  action,
  className = '',
  titleAs: Title = 'h1',
}: {
  title: string
  action?: ReactNode
  className?: string
  /** Use 'p' when the page has its own h1 (e.g. the landmark name). */
  titleAs?: 'h1' | 'p'
}) {
  const navigate = useNavigate()
  const location = useLocation()
  // A deep link has no history entry to go back to, so fall back to Explore.
  const back = () => (location.key === 'default' ? navigate('/') : navigate(-1))
  return (
    <header
      className={`z-30 flex items-center justify-between gap-2 rounded-b-chrome bg-ivory-surface px-4 shadow-topbar min-[375px]:px-6 ${className}`}
      style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(var(--spacing-topbar) + env(safe-area-inset-top))' }}
    >
      <button
        type="button"
        onClick={back}
        aria-label="Go back"
        className="-ml-1 flex size-12 shrink-0 items-center justify-center rounded-full text-navy focus-visible:outline-2 focus-visible:outline-navy"
      >
        <ArrowBackIcon />
      </button>
      <Title className="min-w-0 flex-1 truncate text-center text-2xl font-bold tracking-wide text-navy">{title}</Title>
      <div className="-mr-1 flex size-12 shrink-0 items-center justify-center">{action}</div>
    </header>
  )
}
