import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Landmark } from '@/api/types'
import { routes } from '@/routes'
import { mockFetch, renderRoutes } from '@/test/render'

const cross: Landmark = {
  id: 'magellans-cross',
  name: "Magellan's Cross",
  category: 'monument',
  district: 'Plaza Sugbo, Cebu City',
  latitude: 10.29,
  longitude: 123.9,
  imageUrl: null,
  admissionFee: 0,
  rating: 4.7,
  visitCount: 10,
  estimatedVisitMinutes: 20,
  visitingHours: '8:00 AM - 7:00 PM',
  story: { about: 'A cross from 1521.', significance: 'Early encounter.', architecture: 'Octagonal kiosk.', trivia: 'Look up.' },
}

/** Answers landmark requests with the cross and chat requests with `reply`. */
function api(reply: (question: string) => string) {
  return mockFetch((url, init) => {
    if (url.pathname !== '/v1/chat') return { data: cross }
    const body = JSON.parse(String(init?.body)) as { messages: { content: string }[] }
    return { data: { message: { role: 'model', content: reply(body.messages.at(-1)!.content) }, progress: null } }
  })
}

describe('Landmark details', () => {
  it('shows a loading skeleton, then the story with the scan match score', async () => {
    api(() => '')
    renderRoutes(routes, { pathname: '/landmarks/magellans-cross', state: { match: { confidence: 0.98 } } })
    expect(await screen.findByRole('status', { name: 'Loading landmark' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: "Magellan's Cross" })).toBeInTheDocument()
    expect(screen.getByText(/Landmark matched · 98%/)).toBeInTheDocument()
    expect(screen.getByText('Look up.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Scan another landmark' })).toHaveAttribute('href', '/scan')
  })

  it('opens the chat and asks a follow-up question from a chip', async () => {
    const fetch = api((question) => `About "${question}": it was 1521.`)
    renderRoutes(routes, '/landmarks/magellans-cross')
    await userEvent.click(await screen.findByRole('link', { name: 'Who built it, and when?' }))
    expect(await screen.findByText('About "Who built it, and when?": it was 1521.', {}, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ask bAI' })).toBeInTheDocument()
    expect(fetch.mock.calls.filter(([input]) => String(input).includes('/v1/chat'))).toHaveLength(1)
  })
})

describe('ChatPage', () => {
  it('greets the traveler, shows typing while bAI answers, and offers follow-ups', async () => {
    let answer: () => void = () => {}
    const answered = new Promise<void>((resolve) => (answer = resolve))
    const respond = api(() => 'It stands in an octagonal kiosk.').getMockImplementation()!
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).includes('/v1/chat')) await answered
      return respond(input, init)
    })
    renderRoutes(routes, '/landmarks/magellans-cross/chat')
    const conversation = await screen.findByRole('list', { name: 'Conversation' })
    expect(within(conversation).getByText(/I'm your guide at/)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Message'), 'What does it look like?')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('bAI is typing…')).toBeInTheDocument()
    answer()
    expect(await screen.findByText('It stands in an octagonal kiosk.')).toBeInTheDocument()
    expect(screen.queryByText('bAI is typing…')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Why is it important?' }))
    expect(await within(conversation).findByText('Why is it important?')).toBeInTheDocument()
  })

  it('lets the traveler retry when bAI cannot answer', async () => {
    let fail = true
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/v1/chat')) {
        if (fail) return new Response(JSON.stringify({ error: { code: 'bad_request', message: 'bAI is resting.' } }), { status: 400 })
        return new Response(JSON.stringify({ data: { message: { role: 'model', content: 'Back now!' }, progress: null } }))
      }
      return new Response(JSON.stringify({ data: cross }))
    })
    renderRoutes(routes, '/landmarks/magellans-cross/chat')
    await userEvent.type(await screen.findByLabelText('Message'), 'Hello?')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('bAI is resting.')).toBeInTheDocument()
    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Back now!')).toBeInTheDocument()
  })
})
