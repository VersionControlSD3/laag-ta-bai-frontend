import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Landmark } from '@/api/types'
import { writeJson } from '@/lib/storage'
import { routes } from '@/routes'
import { mockFetch, renderRoutes } from '@/test/render'

const fort: Landmark = {
  id: 'fort-san-pedro',
  name: 'Fort San Pedro',
  category: 'fort',
  district: 'Cebu City',
  latitude: 10.29,
  longitude: 123.9,
  imageUrl: null,
  admissionFee: 30,
  rating: 4.7,
  visitCount: 12,
  estimatedVisitMinutes: 60,
  visitingHours: '8:00 AM - 7:00 PM',
  story: { about: 'A triangular fort.', significance: 'Oldest fort.', architecture: 'Coral stone.', trivia: 'Was a zoo.' },
}

describe('app routes', () => {
  it('sends first-time visitors to the welcome screen', async () => {
    renderRoutes(routes, '/')
    expect(await screen.findByText(/Discover Cebu's heritage/)).toBeInTheDocument()
  })

  it('shows the bottom navigation and popular landmarks on Explore', async () => {
    writeJson('preferences', { onboarded: true })
    mockFetch(() => ({ data: [fort] }))
    renderRoutes(routes, '/')
    expect(await screen.findByText('Fort San Pedro')).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Main' })
    for (const label of ['Explore', 'Archives', 'Mastery', 'Profile']) expect(nav).toHaveTextContent(label)
    expect(screen.getByRole('link', { name: 'Scan' })).toBeInTheDocument()
  })

  it('renders landmark story sections and saves a bookmark', async () => {
    mockFetch(() => ({ data: fort }))
    renderRoutes(routes, '/landmarks/fort-san-pedro')
    expect(await screen.findByRole('heading', { name: 'Fort San Pedro' })).toBeInTheDocument()
    expect(screen.getByText('A triangular fort.')).toBeInTheDocument()
    expect(screen.getByText('Historical Significance')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ask bAI/ })).toHaveAttribute('href', '/landmarks/fort-san-pedro/chat')

    await userEvent.click(screen.getByRole('button', { name: 'Save for offline reading' }))
    expect(screen.getByRole('button', { name: 'Remove bookmark' })).toHaveAttribute('aria-pressed', 'true')
    expect(JSON.parse(localStorage.getItem('laagtabai:bookmarks')!)[0].id).toBe('fort-san-pedro')
  })

  it('offers dev sign-in when Supabase is not configured', async () => {
    renderRoutes(routes, '/login')
    expect(await screen.findByRole('button', { name: 'Continue as dev traveler' })).toBeInTheDocument()
  })
})
