import { Navigate, Outlet } from 'react-router'
import { useMe } from '@/api/hooks'
import { Loading } from '@/components/StateMessage'

/**
 * Google sign-in creates the account on first use, with no Terms, 18+ check or nationality.
 * Until the profile records Terms acceptance, send the user to finish it before using the app.
 */
export function ProfileGate() {
  const { data, fetchStatus, dataUpdatedAt, errorUpdatedAt } = useMe()
  // Wait for the first response so a new account doesn't see the app flash before the redirect.
  // Only the first: a refetch after an error goes back to "pending", and pages that refetch on
  // mount would loop. A failed request (offline, API down) still lets the user in.
  if (fetchStatus === 'fetching' && !dataUpdatedAt && !errorUpdatedAt) return <Loading />

  // `=== null`, not falsy: an API without the field yet (undefined) must not lock everyone out.
  if (data?.profile.termsAcceptedAt === null) return <Navigate to="/complete-profile" replace />
  return <Outlet />
}
