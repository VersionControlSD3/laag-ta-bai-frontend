import { Award, Flame, Footprints, Lock, Map as MapIcon } from 'lucide-react'
import { useLandmarks, useMe, useQuests } from '@/api/hooks'
import { PageHeader } from '@/components/PageHeader'
import { SignInPrompt } from '@/components/SignInPrompt'
import { ErrorMessage, Loading } from '@/components/StateMessage'
import { XpBar } from '@/components/XpBar'
import { useAuth } from '@/features/auth/AuthContext'

/** Rank, streak, stats, quests and badges (SRS 3.1.3). */
export default function MasteryPage() {
  const auth = useAuth()
  const me = useMe()
  const quests = useQuests()
  const landmarks = useLandmarks()
  const names = new Map(landmarks.data?.map((l) => [l.id, l.name]))

  return (
    <div>
      <PageHeader title="Mastery" subtitle="Track your journey through Cebu" />

      {auth.status !== 'signed-in' ? (
        <SignInPrompt message="Sign in to earn XP, keep streaks and unlock badges." />
      ) : me.isPending ? (
        <Loading />
      ) : me.isError ? (
        <ErrorMessage error={me.error} onRetry={() => me.refetch()} />
      ) : (
        <section className="mx-5 rounded-3xl border border-line bg-surface p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-coral">Current rank</p>
          <div className="mt-1 flex items-end justify-between">
            <h2 className="text-2xl font-extrabold">{me.data.rank.title}</h2>
            <span className="text-sm font-bold text-primary">Level {me.data.rank.level}</span>
          </div>
          <div className="mt-3">
            <XpBar rank={me.data.rank} />
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
            <Stat icon={<Flame size={18} />} label="Streak" value={`${me.data.stats.streakCount}d`} />
            <Stat icon={<Footprints size={18} />} label="Visited" value={String(me.data.stats.visitedCount)} />
            <Stat icon={<MapIcon size={18} />} label="Districts" value={`${me.data.stats.districtCoveragePercent}%`} />
          </dl>
        </section>
      )}

      <section className="mt-8 px-5" aria-labelledby="quests-title">
        <h2 id="quests-title" className="mb-3 text-2xl font-bold">Heritage Quests</h2>
        {quests.isPending ? (
          <Loading />
        ) : quests.isError ? (
          <ErrorMessage error={quests.error} onRetry={() => quests.refetch()} />
        ) : (
          <ul className="space-y-3">
            {quests.data.map((q) => {
              const pct = Math.round((q.completedLandmarkIds.length / q.landmarkIds.length) * 100)
              return (
                <li key={q.id} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{q.title}</p>
                      <p className="text-xs text-muted">{q.description}</p>
                    </div>
                    <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${q.completed ? 'bg-gold text-maroon' : 'bg-surface-strong text-muted'}`}>
                      {q.completed ? <Award size={12} aria-hidden /> : <Lock size={12} aria-hidden />} {q.badgeName}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-strong" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${q.title} progress`}>
                    <div className="h-full rounded-full bg-leaf" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {q.completedLandmarkIds.length} / {q.landmarkIds.length} sites ·{' '}
                    {q.landmarkIds.map((id) => names.get(id) ?? id).join(', ')}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-strong p-3">
      <dt className="flex items-center justify-center gap-1 text-[10px] uppercase text-muted">
        <span aria-hidden className="text-coral">{icon}</span> {label}
      </dt>
      <dd className="mt-1 text-xl font-extrabold">{value}</dd>
    </div>
  )
}
