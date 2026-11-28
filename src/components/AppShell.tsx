import { Outlet } from 'react-router'
import { useT } from '@/i18n'
import { CompassOutlineIcon } from './icons/ionicons'
import { BottomNav } from './BottomNav'

export function AppShell() {
  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <main className="pb-nav">
        <Outlet />
      </main>
      <BottomNav />
      <LandscapeGuard />
    </div>
  )
}

/** Shown on phones held sideways; the app is portrait-only (SRS 3.6.1). */
export function LandscapeGuard() {
  const t = useT()
  return (
    <div className="landscape-guard fixed inset-0 z-[60] flex-col items-center justify-center gap-3.5 bg-navy px-6 text-center text-on-navy">
      <CompassOutlineIcon size={40} aria-hidden />
      <p className="text-lg leading-6 font-bold text-on-navy">{t.common.rotatePortrait}</p>
    </div>
  )
}
