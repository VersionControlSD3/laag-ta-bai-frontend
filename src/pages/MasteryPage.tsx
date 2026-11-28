import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useMe, useQuests } from '@/api/hooks'
import type { Me } from '@/api/types'
import { FlameIcon, LocationIcon, TrophyIcon } from '@/components/icons/ionicons'
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
import { useT } from '@/i18n'

/** Badges shown before "See all": three rows of the three-column grid. */
const BADGE_PREVIEW = 9

/** Rank, XP, stats, active quests and badges (SRS 3.1.3), from Figma → Final Pages → Mastery Page. */
export default function MasteryPage() {
  const auth = useAuth()
  const t = useT()
  const m = t.mastery
  const me = useMe()
  const quests = useQuests()
  const signedIn = auth.status === 'signed-in'

  return (
    <MasteryScreen>
      {!signedIn ? (
        <>
          <h1 className="text-3xl leading-9 font-extrabold tracking-tight text-ink">{m.title}</h1>
          <MasteryNotice
            title={m.track}
            action={
              <Link to="/login" className={buttonClass}>
                {t.common.signIn}
              </Link>
            }
          >
            {m.signInBody}
          </MasteryNotice>
        </>
      ) : me.isPending ? (
        <RankSkeleton />
      ) : me.isError ? (
        <MasteryNotice alert title={m.progressFailed} action={<RetryButton onClick={() => me.refetch()} />}>
          {m.checkConnection}
        </MasteryNotice>
      ) : (
        <RankSummary me={me.data} />
      )}

      <section className="flex flex-col gap-3" aria-labelledby="quests-title">
        <SectionHeader id="quests-title" title={m.activeQuests} to="/mastery/quests" linkLabel={m.seeAllQuests} />
        {quests.isPending ? (
          <RailSkeleton />
        ) : quests.isError ? (
          <MasteryNotice alert title={m.questsFailed} action={<RetryButton onClick={() => quests.refetch()} />}>
            {m.checkConnection}
          </MasteryNotice>
        ) : (
          <QuestRail quests={activeQuests(quests.data)} allDone={quests.data.length > 0} />
        )}
      </section>

      {/* Badges come from the quests, so when quests fail the retry above covers both. */}
      {!quests.isError && (
        <section className="flex flex-col gap-3" aria-labelledby="badges-title">
          <SectionHeader id="badges-title" title={m.badgeCollection} to="/mastery/badges" linkLabel={m.seeAllBadges} />
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
    <div className="-mb-[calc(96px+env(safe-area-inset-bottom))] min-h-dvh bg-ivory pb-[calc(96px+env(safe-area-inset-bottom))]">
      {top}
      <div className={`flex flex-col gap-5 px-5 ${top ? 'pt-5' : 'pt-[max(3.25rem,env(safe-area-inset-top))]'}`}>{children}</div>
    </div>
  )
}

function RankSummary({ me }: { me: Me }) {
  const { rank, stats, badges } = me
  const level = levelProgress(rank)
  const newTraveller = rank.xp === 0
  const m = useT().mastery
  return (
    <>
      <header className="flex flex-col items-center gap-1.5 text-center">
        <p className="text-xs leading-4 font-bold tracking-[0.1em] text-terracotta-ink uppercase">{m.currentRank}</p>
        <h1 className="text-3xl leading-9 font-extrabold tracking-tight text-ink">{rank.title}</h1>
        <div className="mt-1.5">
          <LevelRing level={rank.level} />
        </div>
      </header>

      <div className="flex flex-col gap-1.5">
        <ProgressBar
          label={m.xpProgress}
          value={level ? `${formatNumber(rank.xp)} / ${formatNumber(rank.nextLevelXp!)}` : `${formatNumber(rank.xp)} XP`}
          ratio={level ? level.into / level.span : 1}
          valueText={
            level
              ? m.levelOf(rank.level, formatNumber(rank.xp), formatNumber(rank.nextLevelXp!))
              : m.levelTop(rank.level, formatNumber(rank.xp))
          }
        />
        <p className="text-xs leading-4 font-medium text-ink-muted">
          {level ? m.until(formatNumber(rank.nextLevelXp! - rank.xp), rank.level + 1) : m.topRank}
        </p>
      </div>

      {newTraveller && (
        <MasteryNotice
          title={m.start}
          action={
            <Link to="/scan" className={linkClass}>
              {m.scanLandmark}
            </Link>
          }
        >
          {m.startBody}
        </MasteryNotice>
      )}

      <dl className="grid grid-cols-3 gap-2.5">
        <StatTile Icon={TrophyIcon} value={String(badges.length)} label={m.awards} tone="navy" />
        <StatTile Icon={FlameIcon} value={String(stats.streakCount)} label={m.streak} tone="terracotta" />
        <StatTile Icon={LocationIcon} value={String(stats.visitedCount)} label={m.visited} tone="sage" />
      </dl>
    </>
  )
}

function QuestRail({ quests, allDone }: { quests: ReturnType<typeof activeQuests>; allDone: boolean }) {
  const m = useT().mastery
  if (quests.length === 0)
    return (
      <MasteryNotice title={allDone ? m.allComplete : m.noQuests}>
        {allDone ? m.allCompleteBody : m.noQuestsBody}
      </MasteryNotice>
    )
  return (
    // Bleeds to the screen edges so cards scroll under the gutter, as in Figma.
    <ul className="-mx-5 flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5 pb-2" aria-label={m.railLabel}>
      {quests.map((q) => (
        <li key={q.id} className="flex snap-start">
          {/* 260 px as in Figma, but never so wide (large text, 320 px phones) that the next card stops peeking in. */}
          <QuestCard quest={q} className="w-[min(16.25rem,calc(100vw-4rem))]" />
        </li>
      ))}
    </ul>
  )
}

export function BadgeGrid({ badges }: { badges: ReturnType<typeof badgesFrom> }) {
  const m = useT().mastery
  if (badges.length === 0)
    return <MasteryNotice title={m.noBadges}>{m.noBadgesBody}</MasteryNotice>
  return (
    <ul className="grid grid-cols-3 gap-x-4 gap-y-5">
      {badges.map((b) => (
        <BadgeTile key={b.questId} badge={b} />
      ))}
    </ul>
  )
}

export function RetryButton({ onClick }: { onClick: () => void }) {
  const t = useT()
  return (
    <button type="button" onClick={onClick} className={linkClass}>
      {t.common.tryAgain}
    </button>
  )
}

function RankSkeleton() {
  const m = useT().mastery
  return (
    <div role="status" className="flex flex-col items-center gap-3">
      <span className="sr-only">{m.loadingProgress}</span>
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
  const m = useT().mastery
  return (
    <div role="status" className="-mx-5 flex gap-3 overflow-hidden px-5">
      <span className="sr-only">{m.loadingQuests}</span>
      {[0, 1].map((i) => (
        <div key={i} aria-hidden className="h-56 w-64 shrink-0 animate-pulse rounded-2xl bg-sage-soft motion-reduce:animate-none" />
      ))}
    </div>
  )
}

export function GridSkeleton() {
  const m = useT().mastery
  return (
    <div role="status" className="grid grid-cols-3 gap-3">
      <span className="sr-only">{m.loadingBadges}</span>
      {[0, 1, 2].map((i) => (
        <div key={i} aria-hidden className="aspect-square animate-pulse rounded-2xl bg-sage-soft motion-reduce:animate-none" />
      ))}
    </div>
  )
}
