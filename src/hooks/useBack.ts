import { useLocation, useNavigate } from 'react-router'

/** Back one screen; opened from a shared link there's no history, so go to Explore instead. */
export function useBack() {
  const navigate = useNavigate()
  const location = useLocation()
  return () => (location.key === 'default' ? navigate('/') : navigate(-1))
}
