import { Link } from 'react-router'
import { useMe, useQuests } from '@/api/hooks'
import { ArrowBackIcon } from '@/components/icons/ionicons'
import { MasteryNotice, QuestCard } from '@/components/MasteryCards'
import { activeQuests, badgesFrom } from '@/features/mastery/progress'
import { useT } from '@/i18n'
import { BadgeGrid, GridSkeleton, MasteryScreen, RailSkeleton, RetryButton } from '@/pages/MasteryPage'

/** Figma TopNavbar: back to Mastery, centred title, 40 px bottom corners. */
function TopBar({ title }: { title: string }) {
  const m = useT().mastery
  return (
    <div className="sticky top-0 z-10 grid grid-cols-[3rem_1fr_3rem] items-center rounded-b-chrome bg-ivory-surface px-3 pt-[env(safe-area-inset-top)] shadow-topbar">
      <Link
        to="/mastery"
        aria-label={m.backToMastery}
        className="flex size-12 items-center justify-center rounded-full text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
      >
        <ArrowBackIcon size={22} />
      </Link>
      <h1 className="flex h-topbar items-center justify-center text-[1.375rem] leading-7 font-bold tracking-[0.01em] text-navy">{title}</h1>
    </div>
  )
}

function Intro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <header className="flex flex-col gap-1.5">
      <p className="text-xs leading-4 font-bold tracking-[0.1em] text-terracotta-ink uppercase">{eyebrow}</p>
      <p className="text-3xl leading-9 font-extrabold tracking-tight text-ink" aria-live="polite">
        {title}
      </p>
      <p className="text-sm leading-5 text-ink-body">{body}</p>
    </header>
  )
}

/** Figma → Mastery Page - All Quests: every active quest, nearest to completion first. */
export function MasteryQuestsPage() {
  const m = useT().mastery
  const quests = useQuests()
  const active = quests.data ? activeQuests(quests.data) : []
  return (
    <MasteryScreen top={<TopBar title={m.allQuests} />}>
      <Intro
        eyebrow={m.keepExploring}
        title={quests.data ? m.activeCount(active.length) : m.yourQuests}
        body={m.questsBody}
      />
      {quests.isPending ? (
        <RailSkeleton />
      ) : quests.isError ? (
        <MasteryNotice alert title={m.questsFailed} action={<RetryButton onClick={() => quests.refetch()} />}>
          {m.checkConnection}
        </MasteryNotice>
      ) : active.length === 0 ? (
        <MasteryNotice title={m.noActive}>{m.noQuestsBody}</MasteryNotice>
      ) : (
        <ul className="flex flex-col gap-4">
          {active.map((q) => (
            <li key={q.id}>
              <QuestCard quest={q} />
            </li>
          ))}
        </ul>
      )}
    </MasteryScreen>
  )
}

/** Figma → Mastery Page - All Badges: unlocked badges first, then locked ones. */
export function MasteryBadgesPage() {
  const m = useT().mastery
  const quests = useQuests()
  const me = useMe()
  const badges = quests.data ? badgesFrom(quests.data, me.data) : []
  const unlocked = badges.filter((b) => b.unlocked).length
  return (
    <MasteryScreen top={<TopBar title={m.allBadges} />}>
      <Intro
        eyebrow={m.yourCollection}
        title={quests.data ? m.unlockedCount(unlocked) : m.yourBadges}
        body={m.badgesBody}
      />
      {quests.isPending ? (
        <GridSkeleton />
      ) : quests.isError ? (
        <MasteryNotice alert title={m.badgesFailed} action={<RetryButton onClick={() => quests.refetch()} />}>
          {m.checkConnection}
        </MasteryNotice>
      ) : (
        <BadgeGrid badges={badges} />
      )}
    </MasteryScreen>
  )
}
