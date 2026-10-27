import type { ComponentType } from 'react'
import { NavLink, useLocation } from 'react-router'
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
type Tab = { to: string; label: string; icon: Icon; activeIcon: Icon }

const TABS: Tab[] = [
  { to: '/', label: 'Explore', icon: MapOutlineIcon, activeIcon: MapIcon },
  { to: '/archives', label: 'Archives', icon: BookOutlineIcon, activeIcon: BookIcon },
  { to: '/scan', label: 'Scan', icon: CameraOutlineIcon, activeIcon: CameraOutlineIcon },
  { to: '/mastery', label: 'Mastery', icon: TrophyOutlineIcon, activeIcon: TrophyIcon },
  { to: '/profile', label: 'Profile', icon: PersonOutlineIcon, activeIcon: PersonIcon },
]

/**
 * Thumb-reach bottom navigation (SRS 3.2.1.1), built from the Figma ScreenNavbar component
 * (Components page, node 151:122). The focused tab gets a filled navy icon and a visible label;
 * the others show an outline icon in ink-muted and keep their label for screen readers only.
 */
export function BottomNav() {
  const { pathname } = useLocation()
  const current = TABS.findIndex((t) => t.to === pathname)
  // Tells the CSS which way to slide: towards the tab's side of the bar.
  const onNavigate = (index: number) => {
    document.documentElement.setAttribute('data-tab-direction', index < current ? 'back' : 'forward')
  }
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md items-center justify-between rounded-t-chrome bg-ivory-surface px-4 shadow-tabbar [view-transition-name:bottom-nav] min-[375px]:px-6"
      style={{ height: 'calc(var(--spacing-tabbar) + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map((tab, i) =>
        tab.to === '/scan' ? (
          <ScanTab key={tab.to} tab={tab} onClick={() => onNavigate(i)} />
        ) : (
          <TabLink key={tab.to} tab={tab} onClick={() => onNavigate(i)} />
        ),
      )}
    </nav>
  )
}

function TabLink({ tab, onClick }: { tab: Tab; onClick: () => void }) {
  return (
    <NavLink
      to={tab.to}
      end={tab.to === '/'}
      viewTransition
      onClick={onClick}
      className="flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
    >
      {({ isActive }) => {
        const Icon = isActive ? tab.activeIcon : tab.icon
        return (
          <>
            <Icon size={isActive ? 28 : 24} className={isActive ? 'text-navy' : 'text-ink-muted'} />
            <span className={isActive ? 'text-xs font-bold whitespace-nowrap text-navy' : 'sr-only'}>{tab.label}</span>
          </>
        )
      }}
    </NavLink>
  )
}

/** The raised Scan button: a navy disc that overlaps the top edge of the bar by 17px, as in Figma. */
function ScanTab({ tab, onClick }: { tab: Tab; onClick: () => void }) {
  return (
    <NavLink
      to={tab.to}
      viewTransition
      onClick={onClick}
      className="group -mt-[17px] flex flex-col items-center gap-1 self-start rounded-full focus-visible:outline-none"
    >
      {({ isActive }) => (
        <>
          <span className="flex size-scan-button items-center justify-center rounded-full border-4 border-ivory bg-navy text-on-navy shadow-navy group-active:bg-navy-pressed group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-navy">
            <tab.icon size={30} />
          </span>
          <span className={isActive ? 'text-xs font-bold text-navy' : 'sr-only'}>{tab.label}</span>
        </>
      )}
    </NavLink>
  )
}
