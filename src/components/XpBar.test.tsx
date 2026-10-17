import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { XpBar } from './XpBar'

describe('XpBar', () => {
  it('shows progress toward the next level', () => {
    render(<XpBar rank={{ level: 2, title: 'Wanderer', xp: 350, currentLevelXp: 200, nextLevelXp: 500 }} />)
    expect(screen.getByText('350 / 500 XP to next level')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
  })
  it('handles the top rank', () => {
    render(<XpBar rank={{ level: 6, title: 'Legend of Sugbo', xp: 5000, currentLevelXp: 4000, nextLevelXp: null }} />)
    expect(screen.getByText('5000 XP · Max rank')).toBeInTheDocument()
  })
})
