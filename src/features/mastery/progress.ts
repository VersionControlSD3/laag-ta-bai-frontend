import type { Me, QuestProgress, Rank } from '@/api/types'

export type Badge = { questId: string; name: string; unlocked: boolean }

/** Share of a quest's landmarks visited, from 0 to 1. */
export function questProgress(quest: QuestProgress): number {
  return quest.landmarkIds.length === 0 ? 0 : quest.completedLandmarkIds.length / quest.landmarkIds.length
}

/**
 * Active quests, nearest to completion first (ClickUp #33). Ties keep the API order, so quests
 * with the same progress stay in the order the API lists them.
 */
export function activeQuests(quests: QuestProgress[]): QuestProgress[] {
  return quests
    .filter((q) => !q.completed)
    .map((q, index) => ({ q, index, progress: questProgress(q) }))
    .sort((a, b) => b.progress - a.progress || a.index - b.index)
    .map(({ q }) => q)
}

/** Every quest awards one badge; it's unlocked once the quest is completed or `/v1/me` lists it. */
export function badgesFrom(quests: QuestProgress[], me: Me | undefined): Badge[] {
  const earned = new Set(me?.badges.map((b) => b.questId))
  const badges = quests.map((q) => ({ questId: q.id, name: q.badgeName, unlocked: q.completed || earned.has(q.id) }))
  // Unlocked first, so the collection opens on what the traveller already has.
  return [...badges.filter((b) => b.unlocked), ...badges.filter((b) => !b.unlocked)]
}

/** XP gained inside the current level and the size of that level; `null` at the max rank. */
export function levelProgress(rank: Rank): { into: number; span: number } | null {
  if (rank.nextLevelXp === null) return null
  return { into: rank.xp - rank.currentLevelXp, span: rank.nextLevelXp - rank.currentLevelXp }
}

export const formatNumber = (value: number) => value.toLocaleString('en-US')
