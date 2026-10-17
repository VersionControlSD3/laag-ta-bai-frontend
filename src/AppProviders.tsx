import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { PreferencesProvider } from '@/features/preferences/PreferencesProvider'
import { CelebrationProvider } from '@/features/progress/CelebrationProvider'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // The API client already retries transient failures.
      queries: { retry: false, staleTime: 60_000, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  })
}

export function AppProviders({ children, queryClient }: { children: ReactNode; queryClient: QueryClient }) {
  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <AuthProvider>
          <CelebrationProvider>{children}</CelebrationProvider>
        </AuthProvider>
      </PreferencesProvider>
    </QueryClientProvider>
  )
}
