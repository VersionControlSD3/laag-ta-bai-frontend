import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { BottomNav } from './BottomNav'

const TABS = ['Explore', 'Archives', 'Scan', 'Mastery', 'Profile']

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>,
  )
  return screen.getByRole('navigation', { name: 'Main' })
}

describe('BottomNav', () => {
  it('links all five tabs to their screens, each with an accessible name', () => {
    const nav = renderAt('/')
    const hrefs = within(nav)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
    expect(hrefs).toEqual(['/', '/archives', '/scan', '/mastery', '/profile'])
    for (const name of TABS) expect(within(nav).getByRole('link', { name })).toBeInTheDocument()
  })

  it.each([
    ['/', 'Explore'],
    ['/archives', 'Archives'],
    ['/scan', 'Scan'],
    ['/mastery', 'Mastery'],
    ['/profile', 'Profile'],
  ])('marks only the current tab active on %s', (path, active) => {
    const nav = renderAt(path)
    const current = within(nav)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
    expect(current).toHaveLength(1)
    expect(current[0]).toHaveAccessibleName(active)
  })

  it('shows a visible label only on the active tab, not by colour alone', () => {
    const nav = renderAt('/mastery')
    for (const name of TABS) {
      const label = within(within(nav).getByRole('link', { name })).getByText(name)
      if (name === 'Mastery') expect(label).not.toHaveClass('sr-only')
      else expect(label).toHaveClass('sr-only')
    }
  })

  it('keeps Explore inactive on nested routes of other tabs', () => {
    const nav = renderAt('/archives/stories')
    expect(within(nav).getByRole('link', { name: 'Explore' })).not.toHaveAttribute('aria-current')
    expect(within(nav).getByRole('link', { name: 'Archives' })).toHaveAttribute('aria-current', 'page')
  })
})
