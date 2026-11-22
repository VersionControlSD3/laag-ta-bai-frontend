import type { ReactNode } from 'react'
import { LocationOutlineIcon } from '@/components/icons/ionicons'
import { usePreferences } from '@/features/preferences/PreferencesContext'

/**
 * UI Redesign #3 auth layout: a Cebu coastal photo band (day photo in light, night photo in dark)
 * with the EN indicator, wordmark, location and editorial tagline, then a rounded sheet that
 * overlaps the photo and holds the form.
 *
 * Only the photo band pins the light palette (`data-palette="light"`) so its white text stays white;
 * the sheet follows the theme.
 */
function RedesignedAuthScreen({ children }: { children: ReactNode }) {
  const night = usePreferences().resolvedTheme === 'dark'
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-ivory-surface">
      <section
        data-palette="light"
        className="relative flex h-[clamp(14rem,32dvh,17rem)] shrink-0 flex-col overflow-hidden bg-navy text-ivory"
      >
        <img
          src={night ? '/authenticationBG/LoginNight.webp' : '/authenticationBG/LoginDay.webp'}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-navy/25" aria-hidden="true" />
        <div className="absolute inset-0 bg-linear-to-b from-ink/50 via-ink/10 to-ink/40" aria-hidden="true" />
        <header className="relative grid grid-cols-[1fr_auto_1fr] items-center px-6 pt-[max(1rem,env(safe-area-inset-top))]">
          <span className="font-mono text-xs font-bold tracking-[0.15em]">
            <span aria-hidden="true">EN</span>
            <span className="sr-only">Language: English</span>
          </span>
          <p className="font-display text-xl font-semibold tracking-tight" role="img" aria-label="Laag ta bAI">
            Laag ta <span className="font-bold italic">bAI</span>
          </p>
          <p className="justify-self-end text-sm font-semibold">Cebu, PH</p>
        </header>
        <p className="relative mt-auto px-6 pb-14 font-display text-[2.125rem] leading-[1.08] font-bold tracking-tight">
          Go where the map <em>runs out.</em>
        </p>
      </section>
      <main className="relative z-10 -mt-8 flex flex-1 flex-col rounded-t-[2rem] bg-ivory-surface px-6 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  )
}

export function AuthScreen({ children, centered = false }: { children: ReactNode; centered?: boolean }) {
  return centered ? <LegacyAuthScreen centered>{children}</LegacyAuthScreen> : <RedesignedAuthScreen>{children}</RedesignedAuthScreen>
}

function LegacyAuthScreen({ children, centered = false }: { children: ReactNode; centered?: boolean }) {
  const night = usePreferences().resolvedTheme === 'dark'
  return (
    <div
      data-theme="light"
      className={`relative min-h-dvh bg-navy bg-cover bg-center ${
        night ? "bg-[url('/authenticationBG/LoginNight.webp')]" : "bg-[url('/authenticationBG/LoginDay.webp')]"
      }`}
    >
      <div className="absolute inset-0 bg-linear-to-b from-navy/35 via-navy/15 to-navy/50" aria-hidden />
      <div
        className={`relative mx-auto w-full max-w-md px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] ${
          centered ? 'flex min-h-dvh flex-col' : ''
        }`}
      >
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
        <main className={centered ? 'my-auto py-8' : 'pt-22'}>{children}</main>
      </div>
    </div>
  )
}

/** The glass navy card ("Section" in Figma): 28px corners, ivory hairline, blurred photo behind. */
export function AuthCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={
        className ??
        'rounded-[28px] border border-ivory/30 bg-linear-to-b from-navy/90 to-navy-pressed/80 px-6 py-8 shadow-2xl backdrop-blur-[36px]'
      }
    >
      {children}
    </section>
  )
}
