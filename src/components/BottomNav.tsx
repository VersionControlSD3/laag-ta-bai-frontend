import { NavLink } from 'react-router'
import { BookOpen, Camera, Map, Trophy, User, type LucideIcon } from 'lucide-react'

type Tab = { to: string; label: string; icon: LucideIcon }

const TABS: Tab[] = [
  { to: '/', label: 'Explore', icon: Map },
  { to: '/archives', label: 'Archives', icon: BookOpen },
  { to: '/scan', label: 'Scan', icon: Camera },
  { to: '/mastery', label: 'Mastery', icon: Trophy },
  { to: '/profile', label: 'Profile', icon: User },
]

/** Thumb-reach bottom navigation (SRS 3.2.1.1), styled after the reference ScreenNavbar. */
export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md items-end justify-around rounded-t-[40px] bg-gradient-to-b from-cream to-[#D9D7CE] px-2 pt-2 shadow-[0_-5px_10px_rgba(0,0,0,0.15)]"
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
    >
      {TABS.map(({ to, label, icon: Icon }) =>
        to === '/scan' ? (
          <NavLink key={to} to={to} aria-label={label} className="-mt-8 flex flex-col items-center">
            {({ isActive }) => (
              <>
                <span className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-cream bg-gold text-maroon shadow-lg motion-safe:animate-[pulse_2s_ease-in-out_infinite]">
                  <Camera size={30} aria-hidden />
                </span>
                <span className={`mt-1 text-xs font-semibold text-[#333] ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ) : (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="touch-target flex flex-1 flex-col items-center justify-center gap-0.5 text-[#333]"
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={24}
                  aria-hidden
                  className={isActive ? 'scale-110 text-amber transition' : 'opacity-60 transition'}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={`text-xs font-bold ${isActive ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
              </>
            )}
          </NavLink>
        ),
      )}
    </nav>
  )
}
