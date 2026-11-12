import type { ReactNode } from 'react'
import { LocationOutlineIcon } from '@/components/icons/ionicons'
import { usePreferences } from '@/features/preferences/PreferencesContext'

/**
 * Figma Final Pages "Login (Day)" / "Login (Night)" (268:7254, 268:7370), the `AuthScreen` frame:
 * a Cebu photo that follows the theme (day photo in light, night photo in dark) under a navy
 * scrim, the brand mark and a location pill, then the glass card from `AuthCard`.
 *
 * The card is navy over a photo in both themes, so the subtree is pinned to the light palette:
 * `navy`, `ivory` and `terracotta` keep their Figma values instead of inverting in dark mode.
 */
export function AuthScreen({ children }: { children: ReactNode }) {
  const night = usePreferences().resolvedTheme === 'dark'
  return (
    <div
      data-theme="light"
      className={`relative min-h-dvh bg-navy bg-cover bg-center ${
        night ? "bg-[url('/authenticationBG/LoginNight.webp')]" : "bg-[url('/authenticationBG/LoginDay.webp')]"
      }`}
    >
      <div className="absolute inset-0 bg-linear-to-b from-navy/35 via-navy/15 to-navy/50" aria-hidden />
      <div className="relative mx-auto w-full max-w-md px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
        <header className="flex items-center justify-between gap-3">
          <p className="flex items-end gap-1.5 text-ivory">
            <span className="sr-only">Laag ta bAI</span>
            <span aria-hidden className="pb-0.5 text-[0.625rem] leading-none font-bold tracking-[0.16em]">
              LAAG TA
            </span>
            <span aria-hidden className="text-[1.5625rem] leading-none font-black tracking-[-0.06em] text-terracotta-light">
              bAI
            </span>
          </p>
          <p className="flex items-center gap-1.5 rounded-full border border-ivory/30 bg-navy/40 px-3 py-2 text-xs font-semibold text-ivory backdrop-blur-md">
            <LocationOutlineIcon size={16} />
            Cebu, Philippines
          </p>
        </header>
        <main className="pt-22">{children}</main>
      </div>
    </div>
  )
}

/** The glass navy card ("Section" in Figma): 28px corners, ivory hairline, blurred photo behind. */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-[28px] border border-ivory/30 bg-linear-to-b from-navy/90 to-navy-pressed/80 px-6 py-8 shadow-2xl backdrop-blur-[36px]">
      {children}
    </section>
  )
}
