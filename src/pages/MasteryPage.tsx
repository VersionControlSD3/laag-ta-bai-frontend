import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useMe, useQuests } from '@/api/hooks'
import type { Me } from '@/api/types'
import { FlameIcon, FootstepsIcon, TrophyIcon } from '@/components/icons/ionicons'
import {
  BadgeTile,
  buttonClass,
  LevelRing,
  linkClass,
  MasteryNotice,
  ProgressBar,
  QuestCard,
  SectionHeader,
  StatTile,
} from '@/components/MasteryCards'
import { useAuth } from '@/features/auth/AuthContext'
import { activeQuests, badgesFrom, formatNumber, levelProgress } from '@/features/mastery/progress'

/** Badges shown before "See all": three rows of the three-column grid. */
const BADGE_PREVIEW = 9

/** Rank, XP, stats, active quests and badges (SRS 3.1.3), from Figma → Final Pages → Mastery Page. */
export default function MasteryPage() {
  const auth = useAuth()
  const me = useMe()
  const quests = useQuests()
  const signedIn = auth.status === 'signed-in'

  return (
    <MasteryScreen>
      {!signedIn ? (
        <>
          <h1 className="text-center text-3xl font-extrabold tracking-tight text-ink">Mastery</h1>
          <MasteryNotice
            title="Track your journey"
            action={
              <Link to="/login" className={buttonClass}>
                Sign in
              </Link>
            }
          >
            Sign in to earn XP, keep streaks and unlock badges.
          </MasteryNotice>
        </>
      ) : me.isPending ? (
        <RankSkeleton />
      ) : me.isError ? (
        <MasteryNotice alert title="Couldn't load your progress" action={<RetryButton onClick={() => me.refetch()} />}>
          Check your connection and try again.
        </MasteryNotice>
      ) : (
        <RankSummary me={me.data} />
      )}

      <section className="flex flex-col gap-3" aria-labelledby="quests-title">
        <SectionHeader id="quests-title" title="Active Quests" to="/mastery/quests" linkLabel="See all quests" />
        {quests.isPending ? (
          <RailSkeleton />
        ) : quests.isError ? (
          <MasteryNotice alert title="Couldn't load quests" action={<RetryButton onClick={() => quests.refetch()} />}>
            Check your connection and try again.
          </MasteryNotice>
        ) : (
          <QuestRail quests={activeQuests(quests.data)} allDone={quests.data.length > 0} />
        )}
      </section>

      {/* Badges come from the quests, so when quests fail the retry above covers both. */}
      {!quests.isError && (
        <section className="flex flex-col gap-3" aria-labelledby="badges-title">
          <SectionHeader id="badges-title" title="Badge Collection" to="/mastery/badges" linkLabel="See all badges" />
          {quests.isPending ? <GridSkeleton /> : <BadgeGrid badges={badgesFrom(quests.data, me.data).slice(0, BADGE_PREVIEW)} />}
        </section>
      )}
    </MasteryScreen>
  )
}

/** Full-bleed ivory background that runs under the bottom nav, with the Figma 20 px gutters. */
export function MasteryScreen({ children, top }: { children: ReactNode; top?: ReactNode }) {
  return (
    // Pulls the background under AppShell's nav padding so the scaffold colour never shows below the list.
    <div className="-mb-[calc(96px+env(safe-area-inset-bottom))] min-h-dvh bg-linear-to-b from-ivory to-ivory-deep pb-[calc(96px+env(safe-area-inset-bottom))]">
      {top}
      <div className={`flex flex-col gap-7 px-5 ${top ? 'pt-6' : 'pt-[max(3rem,env(safe-area-inset-top))]'}`}>{children}</div>
    </div>
  )
}

function RankSummary({ me }: { me: Me }) {
  const { rank, stats, badges } = me
  const level = levelProgress(rank)
  const newTraveller = rank.xp === 0
  return (
    <>
      <header className="flex flex-col items-center gap-1 text-center">
        <p className="text-xs font-bold tracking-[0.1em] text-terracotta-ink uppercase">Current rank</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">{rank.title}</h1>
        <div className="mt-3">
          <LevelRing level={rank.level} />
        </div>
      </header>

      <div className="flex flex-col gap-2">
        <ProgressBar
          label="XP Progress"
          value={level ? `${formatNumber(rank.xp)} / ${formatNumber(rank.nextLevelXp!)}` : `${formatNumber(rank.xp)} XP`}
          ratio={level ? level.into / level.span : 1}
          valueText={
            level
              ? `Level ${rank.level}, ${formatNumber(rank.xp)} of ${formatNumber(rank.nextLevelXp!)} XP`
              : `Level ${rank.level}, ${formatNumber(rank.xp)} XP, top rank`
          }
        />
        <p className="text-xs text-ink-muted">
          {level ? `${formatNumber(rank.nextLevelXp! - rank.xp)} XP until Level ${rank.level + 1}` : 'You reached the top rank.'}
        </p>
      </div>

      {newTraveller && (
        <MasteryNotice
          title="Start your journey"
          action={
            <Link to="/scan" className={linkClass}>
              Scan a landmark
            </Link>
          }
        >
          Scan a landmark or chat with bAI to earn your first XP.
        </MasteryNotice>
      )}

      <dl className="grid grid-cols-3 gap-3">
        <StatTile Icon={TrophyIcon} value={String(badges.length)} label="Awards" tone="navy" />
        <StatTile Icon={FlameIcon} value={String(stats.streakCount)} label="Streak" tone="terracotta" />
        <StatTile Icon={FootstepsIcon} value={String(stats.visitedCount)} label="Visited" tone="sage" />
      </dl>
    </>
  )
}

function QuestRail({ quests, allDone }: { quests: ReturnType<typeof activeQuests>; allDone: boolean }) {
  if (quests.length === 0)
    return (
      <MasteryNotice title={allDone ? 'Every quest complete' : 'No quests yet'}>
        {allDone ? 'You finished every quest. New journeys are on the way.' : 'New heritage quests are on the way. Check back soon.'}
      </MasteryNotice>
    )
  return (
    // Bleeds to the screen edges so cards scroll under the gutter, as in Figma.
    <ul className="-mx-5 flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5 pb-2" aria-label="Active quests, nearest to completion first">
      {quests.map((q) => (
        <li key={q.id} className="flex snap-start">
          {/* 256 px as in Figma, but never so wide (large text, 320 px phones) that the next card stops peeking in. */}
          <QuestCard quest={q} className="w-[min(16rem,calc(100vw-4rem))]" />
        </li>
      ))}
    </ul>
  )
}

export function BadgeGrid({ badges }: { badges: ReturnType<typeof badgesFrom> }) {
  if (badges.length === 0)
    return <MasteryNotice title="No badges yet">Finish a quest to unlock your first badge.</MasteryNotice>
  return (
    <ul className="grid grid-cols-3 gap-x-3 gap-y-5">
      {badges.map((b) => (
        <BadgeTile key={b.questId} badge={b} />
      ))}
    </ul>
  )
}

export function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={linkClass}>
      Try again
    </button>
  )
}

function RankSkeleton() {
  return (
    <div role="status" className="flex flex-col items-center gap-3">
      <span className="sr-only">Loading your progress</span>
      <div aria-hidden className="h-4 w-24 animate-pulse rounded bg-sage-soft motion-reduce:animate-none" />
      <div aria-hidden className="h-9 w-56 animate-pulse rounded-lg bg-sage-soft motion-reduce:animate-none" />
      <div aria-hidden className="size-32 animate-pulse rounded-full bg-sage-soft motion-reduce:animate-none" />
      <div aria-hidden className="h-3 w-full animate-pulse rounded-full bg-sage-soft motion-reduce:animate-none" />
      <div aria-hidden className="grid w-full grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-25 animate-pulse rounded-2xl bg-sage-soft motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  )
}

export function RailSkeleton() {
  return (
    <div role="status" className="-mx-5 flex gap-3 overflow-hidden px-5">
      <span className="sr-only">Loading quests</span>
      {[0, 1].map((i) => (
        <div key={i} aria-hidden className="h-56 w-64 shrink-0 animate-pulse rounded-2xl bg-sage-soft motion-reduce:animate-none" />
      ))}
    </div>
  )
}

export function GridSkeleton() {
  return (
    <div role="status" className="grid grid-cols-3 gap-3">
      <span className="sr-only">Loading badges</span>
      {[0, 1, 2].map((i) => (
        <div key={i} aria-hidden className="aspect-square animate-pulse rounded-2xl bg-sage-soft motion-reduce:animate-none" />
      ))}
    </div>
  )
}
