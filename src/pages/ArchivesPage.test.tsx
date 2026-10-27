import { screen, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, beforeEach } from 'vitest'
import ArchivesPage from './ArchivesPage'
import { renderPage } from '@/test/render'

describe('ArchivesPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders Favorites section at top and History section at bottom clearly separated', () => {
    renderPage(<ArchivesPage />, '/archives')

    const favoritesHeading = screen.getByRole('heading', { name: /Bookmarked Landmarks/i })
    const historyHeading = screen.getByRole('heading', { name: /Visit History/i })

    expect(favoritesHeading).toBeInTheDocument()
    expect(historyHeading).toBeInTheDocument()

    // Assert that Favorites heading comes before History heading in document order
    expect(favoritesHeading.compareDocumentPosition(historyHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })

  it('renders bookmarked Cebu landmarks with visible bookmark indicators', () => {
    renderPage(<ArchivesPage />, '/archives')

    const favorites = screen.getByRole('region', { name: /Bookmarked Landmarks/i })
    expect(within(favorites).getByRole('link', { name: "Magellan's Cross" })).toBeInTheDocument()
    expect(within(favorites).getByRole('link', { name: 'Basilica Minore del Santo Niño' })).toBeInTheDocument()

    // Check visible bookmark indicator button
    const bookmarkBtn = within(favorites).getByRole('button', {
      name: "Remove Magellan's Cross from bookmarked favorites",
    })
    expect(bookmarkBtn).toBeInTheDocument()
    expect(bookmarkBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('renders history items with thumbnail, name, date, and activity tags distinguishable by icon and label', () => {
    renderPage(<ArchivesPage />, '/archives')

    // Find tags by aria-label and text
    const scannedTag = screen.getByLabelText('Activity type: Scanned')
    const visitedTag = screen.getAllByLabelText('Activity type: Visited')[0]
    const viewedTag = screen.getAllByLabelText('Activity type: Viewed')[0]

    expect(scannedTag).toHaveTextContent('Scanned')
    expect(visitedTag).toHaveTextContent('Visited')
    expect(viewedTag).toHaveTextContent('Viewed')

    // Verify icons exist within the tags (not color alone)
    expect(scannedTag.querySelector('svg')).toBeInTheDocument()
    expect(visitedTag.querySelector('svg')).toBeInTheDocument()
    expect(viewedTag.querySelector('svg')).toBeInTheDocument()
  })

  it('groups history items by date (newest first)', () => {
    renderPage(<ArchivesPage />, '/archives')

    const todayGroup = screen.getByText('Today')
    const yesterdayGroup = screen.getByText('Yesterday')

    expect(todayGroup).toBeInTheDocument()
    expect(yesterdayGroup).toBeInTheDocument()
    expect(todayGroup.compareDocumentPosition(yesterdayGroup)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })

  it('allows removing a favorite and reversing it with Undo', async () => {
    renderPage(<ArchivesPage />, '/archives')

    const favorites = screen.getByRole('region', { name: /Bookmarked Landmarks/i })
    const bookmarkBtn = within(favorites).getByRole('button', {
      name: "Remove Magellan's Cross from bookmarked favorites",
    })
    await userEvent.click(bookmarkBtn)

    // Verify it is removed from favorites
    expect(
      within(favorites).queryByRole('button', {
        name: "Remove Magellan's Cross from bookmarked favorites",
      }),
    ).not.toBeInTheDocument()

    // Verify Undo toast appears
    const toast = screen.getByRole('status')
    expect(toast).toHaveTextContent('Removed "Magellan\'s Cross" from favorites')

    // Click Undo
    const undoBtn = within(toast).getByRole('button', { name: /^undo$/i })
    await userEvent.click(undoBtn)

    // Verify Magellan's Cross is restored in favorites!
    expect(
      within(favorites).getByRole('button', {
        name: "Remove Magellan's Cross from bookmarked favorites",
      }),
    ).toBeInTheDocument()
  })

  it('provides an accessible menu button to delete a history item with Undo', async () => {
    renderPage(<ArchivesPage />, '/archives')

    // Open options menu for Magellan's Cross in history
    const menuBtn = screen.getByRole('button', { name: "Options for Magellan's Cross" })
    await userEvent.click(menuBtn)

    // Click delete from history
    const deleteBtn = screen.getByRole('menuitem', { name: /Delete from history/i })
    await userEvent.click(deleteBtn)

    // Check undo notification
    const toast = screen.getByRole('status')
    expect(toast).toHaveTextContent('Deleted "Magellan\'s Cross" from history')

    // Click Undo
    const undoBtn = within(toast).getByRole('button', { name: /^undo$/i })
    await userEvent.click(undoBtn)

    // It is restored
    expect(screen.getByRole('button', { name: "Options for Magellan's Cross" })).toBeInTheDocument()
  })

  it('asks for confirmation before clearing history, and supports undo', async () => {
    renderPage(<ArchivesPage />, '/archives')

    const clearBtn = screen.getByRole('button', { name: /Clear all visit history/i })
    await userEvent.click(clearBtn)

    // Confirmation dialog should appear
    const dialog = screen.getByRole('dialog', { name: /Clear visit history\?/i })
    expect(dialog).toBeInTheDocument()

    // Confirm clear
    const confirmBtn = within(dialog).getByRole('button', { name: /Clear History/i })
    await userEvent.click(confirmBtn)

    // Dialog closes and history is empty
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText(/No activity history yet/i)).toBeInTheDocument()

    // Undo should restore it
    const undoBtn = screen.getByRole('button', { name: /^undo$/i })
    await userEvent.click(undoBtn)

    expect(screen.queryByText(/No activity history yet/i)).not.toBeInTheDocument()
    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  it('displays offline status banner when system goes offline', async () => {
    renderPage(<ArchivesPage />, '/archives')

    // Trigger offline event
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(screen.getByText(/Offline Mode Active/i)).toBeInTheDocument()

    // Trigger online event
    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(screen.queryByText(/Offline Mode Active/i)).not.toBeInTheDocument()
  })

  it('filters favorites by category tabs', async () => {
    renderPage(<ArchivesPage />, '/archives')

    const favorites = screen.getByRole('region', { name: /Bookmarked Landmarks/i })

    // Initially All places shows both Landmarks and Stories
    expect(within(favorites).getByRole('link', { name: "Magellan's Cross" })).toBeInTheDocument()
    expect(within(favorites).getByRole('link', { name: 'Casa Gorordo Museum' })).toBeInTheDocument()

    // Switch to Landmarks
    await userEvent.click(screen.getByRole('tab', { name: /^Landmarks/i }))
    expect(within(favorites).getByRole('link', { name: "Magellan's Cross" })).toBeInTheDocument()
    expect(within(favorites).queryByRole('link', { name: 'Casa Gorordo Museum' })).not.toBeInTheDocument()

    // Switch to Stories
    await userEvent.click(screen.getByRole('tab', { name: /^Stories/i }))
    expect(within(favorites).queryByRole('link', { name: "Magellan's Cross" })).not.toBeInTheDocument()
    expect(within(favorites).getByRole('link', { name: 'Casa Gorordo Museum' })).toBeInTheDocument()
  })
})
