import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { routes } from '@/routes'
import { renderRoutes } from '@/test/render'

describe('OnboardingPage', () => {
  it('walks three slides and ends on Permissions, then Sign up', async () => {
    renderRoutes(routes, '/onboarding')
    expect(await screen.findByRole('heading', { name: 'Every corner has a story.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page 1 of 3' })).toHaveAttribute('aria-current', 'step')

    await userEvent.click(screen.getByRole('button', { name: /Next/ }))
    expect(screen.getByRole('heading', { name: 'Point. Scan. Step into history.' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Next/ }))
    expect(screen.getByRole('heading', { name: 'Learn more with every laag.' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Start exploring/ }))
    expect(await screen.findByRole('heading', { name: 'Ready to explore?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Maybe later' }))
    expect(await screen.findByRole('heading', { name: 'Create Account' })).toBeInTheDocument()
  })

  it('keeps one live region mounted and updates its text on slide change', async () => {
    renderRoutes(routes, '/onboarding')
    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('Page 1 of 3: Every corner has a story.')
    await userEvent.click(screen.getByRole('button', { name: /Next/ }))
    expect(screen.getByRole('status')).toBe(status)
    expect(status).toHaveTextContent('Page 2 of 3: Point. Scan. Step into history.')
  })

  it('swipes between slides', async () => {
    renderRoutes(routes, '/onboarding')
    const main = (await screen.findByRole('main'))
    fireEvent.pointerDown(main, { clientX: 300 })
    fireEvent.pointerUp(main, { clientX: 100 })
    expect(screen.getByRole('heading', { name: 'Point. Scan. Step into history.' })).toBeInTheDocument()
    fireEvent.pointerDown(main, { clientX: 100 })
    fireEvent.pointerUp(main, { clientX: 300 })
    expect(screen.getByRole('heading', { name: 'Every corner has a story.' })).toBeInTheDocument()
  })

  it('a cancelled pointer leaves no stale swipe start', async () => {
    renderRoutes(routes, '/onboarding')
    const main = await screen.findByRole('main')
    fireEvent.pointerDown(main, { clientX: 300 })
    fireEvent.pointerCancel(main)
    // A later pointerup far from the old start must not change slide.
    fireEvent.pointerUp(main, { clientX: 100 })
    expect(screen.getByRole('heading', { name: 'Every corner has a story.' })).toBeInTheDocument()
  })

  it('Skip goes to Login', async () => {
    renderRoutes(routes, '/onboarding')
    await userEvent.click(await screen.findByRole('button', { name: 'Skip onboarding' }))
    expect(await screen.findByRole('button', { name: /sign in|log in/i })).toBeInTheDocument()
  })
})
