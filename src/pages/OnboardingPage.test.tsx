import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { routes } from '@/routes'
import { renderRoutes } from '@/test/render'

describe('OnboardingPage', () => {
  it('walks three slides and ends on Permissions', async () => {
    renderRoutes(routes, '/onboarding')
    expect(await screen.findByRole('heading', { name: 'Every corner has a story.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page 1 of 3' })).toHaveAttribute('aria-current', 'step')

    await userEvent.click(screen.getByRole('button', { name: /Next/ }))
    expect(screen.getByRole('heading', { name: 'Point. Scan. Step into history.' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Next/ }))
    expect(screen.getByRole('heading', { name: 'Learn more with every laag.' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Start exploring/ }))
    expect(await screen.findByRole('heading', { name: 'Ready to explore?' })).toBeInTheDocument()
  })

  it('swipes between slides', async () => {
    renderRoutes(routes, '/onboarding')
    const heading = await screen.findByRole('heading', { name: 'Every corner has a story.' })
    const main = heading.closest('main')!
    fireEvent.pointerDown(main, { clientX: 300 })
    fireEvent.pointerUp(main, { clientX: 100 })
    const next = screen.getByRole('heading', { name: 'Point. Scan. Step into history.' })
    fireEvent.pointerDown(next.closest('main')!, { clientX: 100 })
    fireEvent.pointerUp(next.closest('main')!, { clientX: 300 })
    expect(screen.getByRole('heading', { name: 'Every corner has a story.' })).toBeInTheDocument()
  })

  it('Skip goes to Login', async () => {
    renderRoutes(routes, '/onboarding')
    await userEvent.click(await screen.findByRole('button', { name: 'Skip onboarding' }))
    expect(await screen.findByRole('button', { name: /sign in|log in/i })).toBeInTheDocument()
  })
})
