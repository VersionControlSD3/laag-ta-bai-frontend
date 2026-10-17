import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { useCelebrate } from '@/features/progress/CelebrationContext'
import { api } from './client'
import type { ChatMessage, LandmarkQuery, ProfileUpdate, ProgressUpdate } from './types'

export const queryKeys = {
  landmarks: (query: LandmarkQuery) => ['landmarks', query] as const,
  landmark: (id: string) => ['landmark', id] as const,
  quests: (userId: string | null) => ['quests', userId] as const,
  me: (userId: string | null) => ['me', userId] as const,
}

export function useLandmarks(query: LandmarkQuery = {}) {
  return useQuery({
    queryKey: queryKeys.landmarks(query),
    queryFn: ({ signal }) => api.listLandmarks(query, signal),
  })
}

export function useLandmark(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.landmark(id ?? ''),
    queryFn: ({ signal }) => api.getLandmark(id!, signal),
    enabled: Boolean(id),
  })
}

export function useQuests() {
  const { token, user } = useAuth()
  return useQuery({ queryKey: queryKeys.quests(user?.id ?? null), queryFn: () => api.listQuests(token) })
}

export function useMe() {
  const { token, user } = useAuth()
  return useQuery({
    queryKey: queryKeys.me(user?.id ?? null),
    queryFn: () => api.getMe(token!),
    enabled: Boolean(token),
  })
}

/** Refreshes progress-related data and shows XP / level-up feedback. */
function useProgressHandler() {
  const queryClient = useQueryClient()
  const celebrate = useCelebrate()
  return (progress: ProgressUpdate | null | undefined) => {
    if (!progress) return
    celebrate(progress)
    queryClient.invalidateQueries({ queryKey: ['me'] })
    queryClient.invalidateQueries({ queryKey: ['quests'] })
  }
}

export function useUpdateMe() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (update: ProfileUpdate) => api.updateMe(update, token!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
}

export function useScan() {
  const { token } = useAuth()
  const onProgress = useProgressHandler()
  return useMutation({
    mutationFn: (input: { image: File; lat?: number; lng?: number }) => api.scan(input, token),
    onSuccess: (result) => onProgress(result.progress),
  })
}

export function useChat() {
  const { token } = useAuth()
  const onProgress = useProgressHandler()
  return useMutation({
    mutationFn: (input: { landmarkId: string; messages: ChatMessage[] }) => api.chat(input, token),
    onSuccess: (result) => onProgress(result.progress),
  })
}

export function useCheckIn() {
  const { token } = useAuth()
  const onProgress = useProgressHandler()
  return useMutation({
    mutationFn: (landmarkId: string) => api.checkIn(landmarkId, token!),
    onSuccess: (result) => onProgress(result),
  })
}
