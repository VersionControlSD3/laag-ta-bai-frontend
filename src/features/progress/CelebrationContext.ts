import { createContext, useContext } from 'react'
import type { ProgressUpdate } from '@/api/types'

export type CelebrationState = { celebrate(progress: ProgressUpdate | null | undefined): void }

export const CelebrationContext = createContext<CelebrationState | null>(null)

export function useCelebrate() {
  const ctx = useContext(CelebrationContext)
  if (!ctx) throw new Error('useCelebrate must be used inside <CelebrationProvider>')
  return ctx.celebrate
}
