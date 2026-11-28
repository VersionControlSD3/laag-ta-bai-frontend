import type { Rank } from '@/api/types'
import { useT } from '@/i18n'

/** Linear progress indicator, e.g. "350 / 500 XP to next level" (SRS 3.2.3.1). */
export function XpBar({ rank }: { rank: Rank }) {
  const t = useT()
  const span = rank.nextLevelXp === null ? 1 : rank.nextLevelXp - rank.currentLevelXp
  const into = rank.nextLevelXp === null ? 1 : rank.xp - rank.currentLevelXp
  const percent = Math.round(Math.min(Math.max(into / span, 0), 1) * 100)
  return (
    <div>
      <div
        className="h-3 overflow-hidden rounded-full bg-surface-strong"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={t.common.xp.progress}
      >
        <div className="h-full rounded-full bg-gradient-to-r from-amber to-gold" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1 text-xs font-semibold text-muted">
        {rank.nextLevelXp === null ? t.common.xp.maxRank(rank.xp) : t.common.xp.toNext(rank.xp, rank.nextLevelXp)}
      </p>
    </div>
  )
}
