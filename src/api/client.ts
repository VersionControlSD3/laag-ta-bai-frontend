import { env } from '@/lib/env'
import { mockApi } from './mock'
import type {
  ChatMessage,
  Landmark,
  LandmarkQuery,
  LandmarkSummary,
  Me,
  Profile,
  ProfileUpdate,
  ProgressUpdate,
  QuestProgress,
  ScanResult,
  Visit,
} from './types'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH'
  token?: string | null
  json?: unknown
  form?: FormData
  signal?: AbortSignal
}

const RETRYABLE = new Set([502, 503, 504])
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Fetch wrapper: JSON in/out, bearer auth, and retry with exponential backoff
 * on network errors and 502/503/504 (SRS 3.3.1.3, up to 3 attempts).
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}, attempts = 3): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.token) headers.Authorization = `Bearer ${options.token}`
  if (options.json !== undefined) headers['Content-Type'] = 'application/json'

  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await sleep(300 * 2 ** (attempt - 1))
    let response: Response
    try {
      response = await fetch(`${env.apiUrl}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.form ?? (options.json !== undefined ? JSON.stringify(options.json) : undefined),
        signal: options.signal,
      })
    } catch (error) {
      if (options.signal?.aborted) throw error
      lastError = new ApiError(0, 'network_error', "Can't reach the server. Check your connection and try again.")
      continue
    }

    if (RETRYABLE.has(response.status) && attempt < attempts - 1) {
      lastError = new ApiError(response.status, 'unavailable', 'The service is busy. Please try again.')
      continue
    }

    const body = await response.json().catch(() => null)
    if (!response.ok) {
      const error = body?.error ?? {}
      throw new ApiError(response.status, error.code ?? 'error', error.message ?? 'Something went wrong.')
    }
    return (body as { data: T }).data
  }
  throw lastError
}

function toQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

export const api = {
  listLandmarks: (query: LandmarkQuery = {}, signal?: AbortSignal) =>
    env.mockApi
      ? mockApi.listLandmarks(query)
      : apiRequest<LandmarkSummary[]>(`/v1/landmarks${toQuery(query)}`, { signal }),
  getLandmark: (id: string, signal?: AbortSignal) =>
    env.mockApi ? mockApi.getLandmark(id) : apiRequest<Landmark>(`/v1/landmarks/${encodeURIComponent(id)}`, { signal }),
  listQuests: (token: string | null) => apiRequest<QuestProgress[]>('/v1/quests', { token }),
  scan: (input: { image: File; lat?: number; lng?: number }, token: string | null, signal?: AbortSignal) => {
    if (env.mockApi) return mockApi.scan(signal)
    const form = new FormData()
    form.set('image', input.image)
    if (input.lat !== undefined && input.lng !== undefined) {
      form.set('lat', String(input.lat))
      form.set('lng', String(input.lng))
    }
    return apiRequest<ScanResult>('/v1/scan', { method: 'POST', form, token, signal })
  },
  chat: (input: { landmarkId: string; messages: ChatMessage[] }, token: string | null) =>
    env.mockApi
      ? mockApi.chat(input)
      : apiRequest<{ message: ChatMessage; progress: ProgressUpdate | null }>('/v1/chat', {
          method: 'POST',
          json: input,
          token,
        }),
  getMe: (token: string) => apiRequest<Me>('/v1/me', { token }),
  updateMe: (update: ProfileUpdate, token: string) =>
    apiRequest<Profile>('/v1/me', { method: 'PATCH', json: update, token }),
  checkIn: (landmarkId: string, token: string) =>
    apiRequest<ProgressUpdate & { visit: Visit }>('/v1/me/visits', { method: 'POST', json: { landmarkId }, token }),
}
