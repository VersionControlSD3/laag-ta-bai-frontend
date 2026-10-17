import { describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest } from './client'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('apiRequest', () => {
  it('unwraps data and sends the bearer token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ data: { ok: true } }))
    await expect(apiRequest('/health', { token: 'abc' })).resolves.toEqual({ ok: true })
    const init = fetchMock.mock.calls[0]![1]!
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer abc')
  })

  it('retries a 503 and then succeeds', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json({ data: 1 }))
    await expect(apiRequest('/x')).resolves.toBe(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('throws ApiError with the server message and does not retry 4xx', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(json({ error: { code: 'not_found', message: 'Landmark not found' } }, 404))
    const error = await apiRequest('/v1/landmarks/x').catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404, code: 'not_found', message: 'Landmark not found' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('reports a network error after three attempts', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(apiRequest('/x')).rejects.toMatchObject({ code: 'network_error' })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
