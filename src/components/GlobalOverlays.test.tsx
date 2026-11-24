import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { LandscapeGuard } from '@/components/AppShell'
import { EmptyState, ErrorMessage, Loading } from '@/components/StateMessage'
import { useCelebrate } from '@/features/progress/CelebrationContext'
import { CelebrationProvider } from '@/features/progress/CelebrationProvider'
import NotFoundPage from '@/pages/NotFoundPage'

function TriggerButtons() {
  const celebrate = useCelebrate()
  return (
    <div>
      <button
        type="button"
        onClick={() =>
          celebrate({
            xpAwarded: 50,
            leveledUp: false,
            newBadges: [],
            rank: { level: 4, title: 'Parian Chronicler', xp: 1240, currentLevelXp: 1000, nextLevelXp: 2000 },
          })
        }
      >
        Award XP
      </button>
      <button
        type="button"
        onClick={() =>
          celebrate({
            xpAwarded: 50,
            leveledUp: true,
            newBadges: ['Downtown Walker'],
            rank: { level: 4, title: 'Parian Chronicler', xp: 1240, currentLevelXp: 1000, nextLevelXp: 2000 },
          })
        }
      >
        Level Up
      </button>
    </div>
  )
}

describe('Global overlays, statuses & 404', () => {
  it('renders 404 Not Found with Back to Explore link', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText(/Na-laag ka, bai! This page doesn't exist\./i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Explore' })).toHaveAttribute('href', '/')
  })

  it('shows XP toast and Level Up celebration dialog with Padayon! dismiss', async () => {
    render(
      <CelebrationProvider>
        <TriggerButtons />
      </CelebrationProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Award XP' }))
    expect(screen.getByRole('status')).toHaveTextContent('+50 XP')

    await userEvent.click(screen.getByRole('button', { name: 'Level Up' }))
    const dialog = screen.getByRole('dialog', { name: 'Level 4!' })
    expect(dialog).toHaveTextContent('You are now a Parian Chronicler.')
    expect(dialog).toHaveTextContent('Downtown Walker Unlocked')

    await userEvent.click(screen.getByRole('button', { name: 'Padayon! (Continue)' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders LandscapeGuard and tokenized StateMessage variants', async () => {
    const onRetry = vi.fn()
    render(
      <>
        <LandscapeGuard />
        <Loading label="Fetching stories…" />
        <ErrorMessage error={new Error('Network offline')} onRetry={onRetry} />
        <EmptyState icon={<span aria-hidden>*</span>} title="Nothing here yet">
          Start exploring Cebu.
        </EmptyState>
      </>,
    )

    expect(screen.getByText('Please rotate your phone to portrait')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Fetching stories…')
    expect(screen.getByRole('alert')).toHaveTextContent('Network offline')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledOnce()
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
  })
})
