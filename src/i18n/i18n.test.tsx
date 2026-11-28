import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { readJson, writeJson } from '@/lib/storage'
import { routes } from '@/routes'
import { mockFetch, renderRoutes } from '@/test/render'
import { MESSAGES } from './index'

/** Message functions take numbers, names or lists; try sample arguments until one shape fits. */
function callWithSamples(fn: (...args: unknown[]) => string): string {
  for (const args of [[1, 2, 'x'], ['x', 'x', 'x'], [['x', 'y']], ['x', true]]) {
    try {
      return fn(...args)
    } catch {
      // wrong argument shape, try the next one
    }
  }
  throw new Error(`no sample arguments fit ${fn}`)
}

/** Every leaf of a message tree, as [path, value]; functions are called with sample arguments. */
function leaves(node: unknown, path = ''): [string, string][] {
  if (typeof node === 'string') return [[path, node]]
  if (typeof node === 'function') return [[path, String(callWithSamples(node as (...args: unknown[]) => string))]]
  if (Array.isArray(node)) return node.flatMap((item, i) => leaves(item, `${path}[${i}]`))
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) => leaves(value, path ? `${path}.${key}` : key))
}

describe('Cebuano messages', () => {
  it('translate every English key with non-empty text', () => {
    const en = new Map(leaves(MESSAGES.en))
    const ceb = new Map(leaves(MESSAGES.ceb))
    expect([...ceb.keys()].sort()).toEqual([...en.keys()].sort())
    // legal.referenceNote is intentionally empty in English (the English text is the reference).
    const empty = [...ceb].filter(([path, text]) => !text.trim() && path !== 'legal.referenceNote')
    expect(empty).toEqual([])
  })

  it('keep unique weekday labels, which the date picker uses as React keys', () => {
    expect(new Set(MESSAGES.ceb.auth.datePicker.weekdays).size).toBe(7)
  })
})

describe('app language (ClickUp bug #13)', () => {
  beforeEach(() => {
    mockFetch(() => ({ data: [] }))
  })

  it('shows the app in Cebuano when Cebuano is the saved language', async () => {
    writeJson('preferences', { onboarded: true, language: 'ceb' })
    renderRoutes(routes, '/')

    expect(await screen.findByRole('heading', { name: 'Suroy', level: 1 })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Panguna' })
    expect(within(nav).getByRole('link', { name: 'Kahanas' })).toHaveAttribute('href', '/mastery')
    expect(document.documentElement.lang).toBe('ceb')
  })

  it('switches the whole app as soon as Cebuano is picked on Profile, and back to English', async () => {
    writeJson('preferences', { onboarded: true, language: 'en' })
    renderRoutes(routes, '/profile')

    await userEvent.click(await screen.findByRole('button', { name: /Language, current selection: English/ }))
    await userEvent.click(screen.getByRole('radio', { name: 'Cebuano' }))

    expect(await screen.findByRole('heading', { name: 'Profile', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Mga Preference')).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Panguna' })
    expect(within(nav).getByRole('link', { name: 'Suroy' })).toBeInTheDocument()
    expect(readJson('preferences', { language: 'en' }).language).toBe('ceb')

    await userEvent.click(screen.getByRole('button', { name: /Pinulongan, kasamtangang gipili: Cebuano/ }))
    await userEvent.click(screen.getByRole('radio', { name: 'English' }))
    expect(await screen.findByText('Preferences')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
  })
})
