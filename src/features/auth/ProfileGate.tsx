import { Navigate, Outlet } from 'react-router'
import { useMe } from '@/api/hooks'

/**
 * Google sign-in creates the account on first use, with no Terms, 18+ check or nationality.
 * Until the profile records Terms acceptance, send the user to finish it before using the app.
 */
export function ProfileGate() {
  const { data } = useMe()
  // `=== null`, not falsy: an API without the field yet (undefined) must not lock everyone out.
  if (data?.profile.termsAcceptedAt === null) return <Navigate to="/complete-profile" replace />
  return <Outlet />
}
