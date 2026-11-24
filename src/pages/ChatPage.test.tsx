import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Landmark } from '@/api/types'
import { routes } from '@/routes'
import { mockFetch, renderRoutes } from '@/test/render'

const cross: Landmark = {
  id: 'magellans-cross',
  name: "Magellan's Cross",
  category: 'monument',
  district: 'Downtown Cebu',
  latitude: 10.29,
  longitude: 123.9,
  imageUrl: null,
  admissionFee: 0,
  rating: 4.8,
  visitCount: 1420,
  estimatedVisitMinutes: 25,
  visitingHours: '8:00 AM - 6:00 PM',
  story: { about: '', significance: '', architecture: '', trivia: '' },
}

describe('Ask bAI chat', () => {
  it('greets with a landmark summary, answers a quick prompt and records feedback', async () => {
    const sent: unknown[] = []
    mockFetch((url, init) => {
      if (url.pathname.endsWith('/chat')) {
        sent.push(JSON.parse(String(init?.body)))
        return { data: { message: { role: 'model', content: 'It is on **Plaza Sugbo**.' }, progress: null } }
      }
      return { data: cross }
    })
    renderRoutes(routes, '/landmarks/magellans-cross/chat')

    expect(await screen.findByRole('heading', { level: 1, name: "Ask bAI about Magellan's Cross" })).toBeInTheDocument()
    expect(screen.getByText(/^Today, /)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Free · 4\.8 · Downtown Cebu · 25 min/ })).toHaveAttribute('href', '/landmarks/magellans-cross')
    expect(screen.getByRole('link', { name: 'Scan or upload a photo' })).toHaveAttribute('href', '/scan')
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Where is this place?' }))
    expect(await screen.findByText('Plaza Sugbo')).toBeInTheDocument()
    // The local greeting is not sent; the conversation starts with the traveller.
    expect(sent[0]).toMatchObject({ landmarkId: 'magellans-cross', messages: [{ role: 'user', content: 'Where is this place?' }] })

    await userEvent.click(screen.getByRole('button', { name: 'Helpful' }))
    expect(screen.getByRole('button', { name: 'Helpful' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Needs improvement' })).toHaveAttribute('aria-pressed', 'false')
    expect(JSON.parse(localStorage.getItem('laagtabai:chat:magellans-cross')!).at(-1).feedback).toBe('helpful')
  })
})
