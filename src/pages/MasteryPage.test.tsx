import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Me, QuestProgress } from '@/api/types'
import { activeQuests } from '@/features/mastery/progress'
import { writeJson } from '@/lib/storage'
import { routes } from '@/routes'
import { mockFetch, renderRoutes } from '@/test/render'

const quest = (id: string, done: number, total: number, extra: Partial<QuestProgress> = {}): QuestProgress => ({
  id,
  title: `Quest ${id}`,
  description: `Visit ${total} landmarks`,
  badgeName: `Badge ${id}`,
  landmarkIds: Array.from({ length: total }, (_, i) => `${id}-${i}`),
  completedLandmarkIds: Array.from({ length: done }, (_, i) => `${id}-${i}`),
  completed: done === total,
  ...extra,
})

// 'a' 1/5, 'b' 4/5, 'c' done, 'd' 0/3: active order is b, a, d.
const quests = [quest('a', 1, 5), quest('b', 4, 5), quest('c', 3, 3), quest('d', 0, 3)]

const me = (overrides: Partial<Me['rank']> = {}, badges: Me['badges'] = [{ questId: 'c', name: 'Badge c' }]): Me => ({
  profile: {
    id: 'local-dev-user',
    displayName: 'Dev Traveler',
    avatarUrl: null,
    nationality: null,
    bio: null,
    language: 'en',
    xp: 1240,
    streakCount: 7,
    lastActiveDate: null,
  },
  email: null,
  rank: { level: 8, title: 'Cebuano Explorer', xp: 1240, currentLevelXp: 1000, nextLevelXp: 1500, ...overrides },
  stats: { visitedCount: 19, districtCoveragePercent: 40, streakCount: 7 },
  badges,
  recentVisits: [],
})

function api(meBody: Me) {
  return mockFetch((url) => (url.pathname.endsWith('/v1/me') ? { data: meBody } : { data: quests }))
}

describe('Mastery', () => {
  beforeEach(() => writeJson('preferences', { onboarded: true }))

  describe('signed in', () => {
    beforeEach(() => writeJson('dev-user', { id: 'local-dev-user', email: null, displayName: 'Dev Traveler' }))

    it('shows rank, level, XP with numbers and a screen reader label, and the three stats', async () => {
      api(me())
      renderRoutes(routes, '/mastery')
      expect(await screen.findByRole('heading', { level: 1, name: 'Cebuano Explorer' })).toBeInTheDocument()
      expect(screen.getByText('08')).toBeInTheDocument()
      expect(screen.getByText('1,240 / 1,500')).toBeInTheDocument()
      expect(screen.getByText('260 XP until Level 9')).toBeInTheDocument()
      expect(screen.getByRole('progressbar', { name: 'XP Progress' })).toHaveAttribute('aria-valuetext', 'Level 8, 1,240 of 1,500 XP')

      for (const [label, value] of [['Awards', '1'], ['Streak', '7'], ['Visited', '19']]) {
        const term = screen.getByText(label)
        expect(term.tagName).toBe('DT')
        expect(term.nextElementSibling).toHaveTextContent(value)
      }
      expect(screen.getByRole('link', { name: 'Mastery' })).toHaveAttribute('aria-current', 'page')
    })

    it('lists active quests nearest to completion first, with progress in text', async () => {
      api(me())
      renderRoutes(routes, '/mastery')
      const rail = await screen.findByRole('list', { name: 'Active quests, nearest to completion first' })
      const titles = within(rail).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
      expect(titles).toEqual(['Quest b', 'Quest a', 'Quest d'])
      expect(within(rail).getByText('4/5')).toBeInTheDocument()
      expect(within(rail).getAllByRole('progressbar')[0]).toHaveAttribute('aria-valuetext', '4 of 5 landmarks visited')
      expect(screen.getByRole('link', { name: 'See all quests' })).toHaveAttribute('href', '/mastery/quests')
    })

    it('marks badges as locked or unlocked in text, not only by colour', async () => {
      api(me())
      renderRoutes(routes, '/mastery')
      const grid = (await screen.findByRole('heading', { name: 'Badge Collection' })).closest('section')!
      const items = await within(grid).findAllByRole('listitem')
      expect(items[0]).toHaveTextContent('Badge c, unlocked')
      expect(items[1]).toHaveTextContent('Badge a, locked')
      expect(within(grid).getAllByText('Locked')).toHaveLength(3)
    })

    it('welcomes a new traveller with no XP yet', async () => {
      api(me({ level: 1, title: 'Newcomer', xp: 0, currentLevelXp: 0, nextLevelXp: 100 }, []))
      renderRoutes(routes, '/mastery')
      expect(await screen.findByText('Start your journey')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Scan a landmark' })).toHaveAttribute('href', '/scan')
      expect(screen.getByText('100 XP until Level 2')).toBeInTheDocument()
    })

    it('shows an error with a retry when progress fails to load', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
        if (url.pathname.endsWith('/v1/me'))
          return new Response(JSON.stringify({ error: { code: 'not_found', message: 'Nope' } }), { status: 404 })
        return new Response(JSON.stringify({ data: quests }), { status: 200 })
      })
      renderRoutes(routes, '/mastery')
      expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load your progress")
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    })

    it('opens All Quests and All Badges from "See all"', async () => {
      api(me())
      renderRoutes(routes, '/mastery')
      await userEvent.click(await screen.findByRole('link', { name: 'See all quests' }))
      expect(await screen.findByRole('heading', { level: 1, name: 'All Quests' })).toBeInTheDocument()
      expect(await screen.findByText('3 active quests')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Mastery' })).toHaveAttribute('aria-current', 'page')

      await userEvent.click(screen.getByRole('link', { name: 'Back to Mastery' }))
      await userEvent.click(await screen.findByRole('link', { name: 'See all badges' }))
      expect(await screen.findByRole('heading', { level: 1, name: 'All Badges' })).toBeInTheDocument()
      expect(await screen.findByText('1 badge unlocked')).toBeInTheDocument()
    })
  })

  it('asks signed-out travellers to sign in but still shows quests', async () => {
    api(me())
    renderRoutes(routes, '/mastery')
    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
    expect(await screen.findByText('Quest b')).toBeInTheDocument()
  })
})

describe('activeQuests', () => {
  it('drops completed quests and keeps API order for ties', () => {
    const list = [quest('x', 1, 4), quest('y', 2, 2), quest('z', 1, 4), quest('w', 3, 4)]
    expect(activeQuests(list).map((q) => q.id)).toEqual(['w', 'x', 'z'])
  })
})
