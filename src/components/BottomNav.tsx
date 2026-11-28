import type { ComponentType } from 'react'
import { NavLink, useLocation } from 'react-router'
import { useT, type Messages } from '@/i18n'
import {
  BookIcon,
  BookOutlineIcon,
  CameraOutlineIcon,
  MapIcon,
  MapOutlineIcon,
  PersonIcon,
  PersonOutlineIcon,
  TrophyIcon,
  TrophyOutlineIcon,
} from './icons/ionicons'

type Icon = ComponentType<{ size?: number; className?: string }>
type Tab = { to: string; label: keyof Messages['common']['nav']; icon: Icon; activeIcon: Icon }

const TABS: Tab[] = [
  { to: '/', label: 'explore', icon: MapOutlineIcon, activeIcon: MapIcon },
  { to: '/archives', label: 'archives', icon: BookOutlineIcon, activeIcon: BookIcon },
  { to: '/scan', label: 'scan', icon: CameraOutlineIcon, activeIcon: CameraOutlineIcon },
  { to: '/mastery', label: 'mastery', icon: TrophyOutlineIcon, activeIcon: TrophyIcon },
  { to: '/profile', label: 'profile', icon: PersonOutlineIcon, activeIcon: PersonIcon },
]

/**
 * Thumb-reach bottom navigation (SRS 3.2.1.1): the floating pill BottomNav from Figma (Components
 * page, node 551:971; UI Redesign #6). The active tab gets a navy-soft pill, a filled navy icon and
 * a visible label; the others show an outline icon in ink-muted and keep their label for screen
 * readers only. Scan is a coral-to-lagoon gradient disc that turns solid coral, with a ring, while Scan is open.
 */
export function BottomNav() {
  const { pathname } = useLocation()
  const t = useT()
  const current = TABS.findIndex((t) => t.to === pathname)
  // Tells the CSS which way to slide: towards the tab's side of the bar. Re-tapping the current tab doesn't animate.
  const onNavigate = (index: number) => {
    document.documentElement.setAttribute('data-tab-direction', index < current ? 'back' : 'forward')
  }
  return (
    <nav
      aria-label={t.common.nav.main}
      className="fixed inset-x-3.5 bottom-[calc(14px+env(safe-area-inset-bottom))] z-40 mx-auto flex min-h-tabbar max-w-[calc(28rem-28px)] items-center justify-between rounded-full border border-ivory-line bg-ivory-surface px-[10px] py-[6px] shadow-navy [view-transition-name:bottom-nav]"
    >
      {TABS.map((tab, i) =>
        tab.to === '/scan' ? (
          <ScanTab key={tab.to} tab={tab} label={t.common.nav[tab.label]} animate={i !== current} onClick={() => onNavigate(i)} />
        ) : (
          <TabLink key={tab.to} tab={tab} label={t.common.nav[tab.label]} animate={i !== current} onClick={() => onNavigate(i)} />
        ),
      )}
    </nav>
  )
}

function TabLink({ tab, label, animate, onClick }: { tab: Tab; label: string; animate: boolean; onClick: () => void }) {
  return (
    <NavLink
      to={tab.to}
      end={tab.to === '/'}
      viewTransition={animate}
      onClick={onClick}
      className={({ isActive }) =>
        // Targets in px so they stay 48px; the active tab may widen to fit its label at large text sizes.
        `flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${isActive ? 'min-w-fit bg-navy-soft' : 'min-w-[48px]'}`
      }
    >
      {({ isActive }) => {
        const Icon = isActive ? tab.activeIcon : tab.icon
        return (
          <>
            <Icon size={20} className={isActive ? 'text-navy' : 'text-ink-muted'} />
            <span
              className={
                isActive
                  ? 'text-[0.6875rem] leading-[0.875rem] font-bold tracking-[0.02em] whitespace-nowrap text-navy'
                  : 'sr-only'
              }
            >
              {label}
            </span>
          </>
        )
      }}
    </NavLink>
  )
}

/** Scan: a 48px coral-to-lagoon disc inside the bar; solid coral with a ring while Scan is open, so the state isn't colour alone. */
function ScanTab({ tab, label, animate, onClick }: { tab: Tab; label: string; animate: boolean; onClick: () => void }) {
  return (
    <NavLink
      to={tab.to}
      viewTransition={animate}
      onClick={onClick}
      className={({ isActive }) =>
        `flex size-[48px] shrink-0 items-center justify-center rounded-full text-on-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
          isActive
            ? 'bg-terracotta ring-2 ring-terracotta ring-offset-2 ring-offset-ivory-surface'
            : 'bg-linear-to-br from-terracotta to-navy active:to-navy-pressed'
        }`
      }
    >
      <tab.icon size={22} />
      <span className="sr-only">{label}</span>
    </NavLink>
  )
}
