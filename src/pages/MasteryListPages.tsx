import { Link } from 'react-router'
import { useMe, useQuests } from '@/api/hooks'
import { ArrowBackIcon } from '@/components/icons/ionicons'
import { MasteryNotice, QuestCard } from '@/components/MasteryCards'
import { activeQuests, badgesFrom } from '@/features/mastery/progress'
import { BadgeGrid, GridSkeleton, MasteryScreen, RailSkeleton, RetryButton } from '@/pages/MasteryPage'

/** Figma TopNavbar: back to Mastery, centred title, 40 px bottom corners. */
function TopBar({ title }: { title: string }) {
  return (
    <div className="sticky top-0 z-10 grid grid-cols-[3rem_1fr_3rem] items-center rounded-b-chrome bg-ivory-surface px-3 pt-[env(safe-area-inset-top)] shadow-topbar">
      <Link
        to="/mastery"
        aria-label="Back to Mastery"
        className="flex size-12 items-center justify-center rounded-full text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
      >
        <ArrowBackIcon size={24} />
      </Link>
      <h1 className="flex h-topbar items-center justify-center text-2xl font-bold text-navy">{title}</h1>
    </div>
  )
}

function Intro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <header className="flex flex-col gap-1">
      <p className="text-[0.625rem] leading-[0.875rem] font-bold tracking-[0.1em] text-terracotta-ink uppercase">{eyebrow}</p>
      <p className="text-2xl font-extrabold tracking-tight text-ink" aria-live="polite">
        {title}
      </p>
      <p className="text-sm text-ink-body">{body}</p>
    </header>
  )
}

/** Figma → Mastery Page - All Quests: every active quest, nearest to completion first. */
export function MasteryQuestsPage() {
  const quests = useQuests()
  const active = quests.data ? activeQuests(quests.data) : []
  return (
    <MasteryScreen top={<TopBar title="All Quests" />}>
      <Intro
        eyebrow="Keep exploring"
        title={quests.data ? `${active.length} active ${active.length === 1 ? 'quest' : 'quests'}` : 'Your quests'}
        body="Complete each journey to earn XP and unlock new ranks."
      />
      {quests.isPending ? (
        <RailSkeleton />
      ) : quests.isError ? (
        <MasteryNotice alert title="Couldn't load quests" action={<RetryButton onClick={() => quests.refetch()} />}>
          Check your connection and try again.
        </MasteryNotice>
      ) : active.length === 0 ? (
        <MasteryNotice title="No active quests">New heritage quests are on the way. Check back soon.</MasteryNotice>
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
  const quests = useQuests()
  const me = useMe()
  const badges = quests.data ? badgesFrom(quests.data, me.data) : []
  const unlocked = badges.filter((b) => b.unlocked).length
  return (
    <MasteryScreen top={<TopBar title="All Badges" />}>
      <Intro
        eyebrow="Your collection"
        title={quests.data ? `${unlocked} ${unlocked === 1 ? 'badge' : 'badges'} unlocked` : 'Your badges'}
        body="Every badge marks a milestone in your Cebu heritage journey."
      />
      {quests.isPending ? (
        <GridSkeleton />
      ) : quests.isError ? (
        <MasteryNotice alert title="Couldn't load badges" action={<RetryButton onClick={() => quests.refetch()} />}>
          Check your connection and try again.
        </MasteryNotice>
      ) : (
        <BadgeGrid badges={badges} />
      )}
    </MasteryScreen>
  )
}
