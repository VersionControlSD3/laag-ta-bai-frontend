import type { ComponentType, ReactNode } from 'react'
import { Link } from 'react-router'
import type { QuestProgress } from '@/api/types'
import { BookIcon, LockClosedIcon, RibbonIcon, StarIcon } from '@/components/icons/ionicons'
import type { Badge } from '@/features/mastery/progress'

/*
 * Mastery pieces from Figma → 07 · Mastery & Gamification (LevelRing, ProgressBar, StatTile,
 * QuestCard, BadgeTile, StateNotice). Colours, sizes and type follow the Lagoon & Coral tokens.
 */

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy'

/** One per screen, under Current Rank and above the XP ProgressBar. */
export function LevelRing({ level }: { level: number }) {
  return (
    <div className="flex size-32 items-center justify-center rounded-full border-4 border-navy bg-ivory-surface shadow-navy">
      <div className="flex size-28 flex-col items-center justify-center rounded-full border border-terracotta">
        <span className="text-xs leading-4 font-bold tracking-[0.1em] text-ink-muted uppercase">Level</span>
        <span className="text-5xl leading-none font-extrabold text-navy">{String(level).padStart(2, '0')}</span>
      </div>
    </div>
  )
}

const BAR_TONE = {
  navy: { fill: 'bg-navy', value: 'text-navy' },
  terracotta: { fill: 'bg-terracotta', value: 'text-terracotta-ink' },
} as const

/**
 * Figma ProgressBar: label and numbers above a 12 px (lg) or 6 px (xs) track. `valueText` is what
 * screen readers announce, e.g. "Level 8, 1,240 of 1,500 XP".
 */
export function ProgressBar({
  label,
  value,
  ratio,
  valueText,
  tone = 'navy',
  size = 'lg',
  track = 'bg-sage-soft',
}: {
  label: string
  value: string
  ratio: number
  valueText: string
  tone?: keyof typeof BAR_TONE
  size?: 'lg' | 'xs'
  track?: string
}) {
  const percent = Math.round(Math.min(Math.max(ratio, 0), 1) * 100)
  const small = size === 'xs'
  return (
    <div className={`flex flex-col ${small ? 'gap-1' : 'gap-1.5'}`}>
      <div className="flex items-center justify-between gap-2" aria-hidden>
        <span className={small ? 'text-[0.6875rem] leading-[0.875rem] font-bold text-ink-muted' : 'text-xs leading-4 font-bold text-ink-muted'}>
          {label}
        </span>
        <span
          className={`font-mono text-[0.6875rem] leading-[0.875rem] font-bold tracking-[0.02em] tabular-nums ${
            small ? 'text-ink' : BAR_TONE[tone].value
          }`}
        >
          {value}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={valueText}
        className={`overflow-hidden rounded-full ${track} ${small ? 'h-1.5' : 'h-3'}`}
      >
        <div
          className={`h-full rounded-full ${BAR_TONE[tone].fill} motion-safe:transition-[width] motion-safe:duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

const STAT_TONE = { navy: 'text-navy', terracotta: 'text-terracotta', sage: 'text-sage-deep' } as const

/** Always three across. One-word labels. */
export function StatTile({
  Icon,
  value,
  label,
  tone,
}: {
  Icon: ComponentType<{ size?: number; className?: string }>
  value: string
  label: string
  tone: keyof typeof STAT_TONE
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-ivory-line bg-ivory-surface px-2 py-3">
      <Icon size={22} className={STAT_TONE[tone]} />
      {/* <dt> comes first for screen readers ("Streak 7"); `order-last` shows the label under the value. */}
      <dt className="order-last text-[0.6875rem] leading-[0.875rem] font-bold tracking-[0.02em] text-ink-muted uppercase">{label}</dt>
      <dd className="text-lg leading-6 font-bold text-ink">{value}</dd>
    </div>
  )
}

/** Active quest card for the horizontal rail and All Quests list; the goal is a concrete count, at most two lines. */
export function QuestCard({ quest, className = '' }: { quest: QuestProgress; className?: string }) {
  const done = quest.completedLandmarkIds.length
  const total = quest.landmarkIds.length
  const percent = Math.round(Math.min(Math.max(total === 0 ? 0 : done / total, 0), 1) * 100)
  return (
    <article className={`flex flex-col gap-2.5 rounded-2xl border border-ivory-line bg-ivory-surface p-4 shadow-card ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-sage-soft">
          <BookIcon size={18} className="text-sage-deep" />
        </span>
        <span className="truncate rounded-md bg-navy-soft px-2 py-1 text-xs leading-4 font-bold text-navy">{quest.badgeName}</span>
        <span className="shrink-0 font-mono text-[0.6875rem] leading-[0.875rem] font-bold tracking-[0.02em] text-terracotta-ink tabular-nums">
          {done}/{total}
        </span>
      </div>
      <h3 className="text-lg leading-6 font-bold text-ink">{quest.title}</h3>
      <p className="line-clamp-2 text-xs leading-4 font-medium text-ink-muted">{quest.description}</p>
      <div
        role="progressbar"
        aria-label="Progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${done} of ${total} landmarks visited`}
        className="h-1.5 overflow-hidden rounded-full bg-ivory-deep"
      >
        <div
          className="h-full rounded-full bg-terracotta motion-safe:transition-[width] motion-safe:duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <Link
        to="/scan"
        className={`mt-0.5 flex min-h-12 items-center justify-center rounded-lg border border-ivory-line bg-ivory text-xs leading-4 font-bold text-ink ${focus}`}
      >
        Log a visit
      </Link>
    </article>
  )
}

/**
 * Three columns in the grid. Locked badges show a lock and the word "Locked", not just a dimmer
 * colour, and every tile's text says locked or unlocked for screen readers.
 */
export function BadgeTile({ badge }: { badge: Badge }) {
  return (
    <li className="flex flex-col items-center gap-2">
      <div
        aria-hidden
        className={`flex aspect-square w-full max-w-25 flex-col items-center justify-center gap-1 rounded-2xl border-2 ${
          badge.unlocked ? 'border-terracotta bg-terracotta-soft' : 'border-ivory-line bg-ivory-deep'
        }`}
      >
        <RibbonIcon size={30} className={badge.unlocked ? 'text-terracotta-ink' : 'text-ink-faint'} />
        {badge.unlocked ? (
          <StarIcon size={12} className="text-terracotta" />
        ) : (
          <span className="flex items-center gap-1 text-[0.6875rem] leading-[0.875rem] font-bold tracking-[0.02em] text-ink-muted uppercase">
            <LockClosedIcon size={10} />
            Locked
          </span>
        )}
      </div>
      <span className={`text-center text-xs leading-4 font-bold ${badge.unlocked ? 'text-ink' : 'text-ink-muted'}`}>
        {badge.name}
        <span className="sr-only">, {badge.unlocked ? 'unlocked' : 'locked'}</span>
      </span>
    </li>
  )
}

/** Section heading with an optional "See all" link, as on the Mastery frame. */
export function SectionHeader({ id, title, to, linkLabel }: { id: string; title: string; to?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 id={id} className="text-lg leading-6 font-bold text-ink">
        {title}
      </h2>
      {to && (
        <Link to={to} aria-label={linkLabel} className={`flex min-h-12 items-center px-2 text-xs leading-4 font-bold text-terracotta-ink ${focus}`}>
          See all
        </Link>
      )}
    </div>
  )
}

/** A quiet card for empty, signed-out and error states (Figma Laag ta bAI/StateNotice). */
export function MasteryNotice({ title, children, action, alert }: { title: string; children?: ReactNode; action?: ReactNode; alert?: boolean }) {
  return (
    <div
      role={alert ? 'alert' : undefined}
      className={`flex flex-col gap-1.5 rounded-[20px] border px-[18px] py-4 ${
        alert ? 'border-danger-line bg-danger-soft text-danger' : 'border-ivory-line bg-ivory-surface'
      }`}
    >
      <p className={`text-[0.9375rem] leading-[1.375rem] font-bold ${alert ? 'text-danger' : 'text-ink'}`}>{title}</p>
      {children && <p className={`text-xs leading-4 font-medium ${alert ? 'text-danger' : 'text-ink-body'}`}>{children}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}

export const buttonClass = `flex min-h-12 items-center justify-center rounded-xl bg-navy px-6 text-base font-bold tracking-[0.05em] text-on-navy uppercase shadow-navy active:bg-navy-pressed ${focus}`
export const linkClass = `flex min-h-12 items-center self-start text-sm font-bold text-terracotta-ink underline ${focus}`
