import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, type RouteObject } from 'react-router'
import { AppShell } from '@/components/AppShell'
import { Loading } from '@/components/StateMessage'
import { usePreferences } from '@/features/preferences/PreferencesContext'
import ExplorePage from '@/pages/ExplorePage'
import SplashScreenPage from '@/pages/SplashScreenPage'

// Explore is eager so the home screen paints fast (SRS 3.4.3); the rest load on demand.
const ArchivesPage = lazy(() => import('@/pages/ArchivesPage'))
const ScanPage = lazy(() => import('@/pages/ScanPage'))
const MasteryPage = lazy(() => import('@/pages/MasteryPage'))
const MasteryQuestsPage = lazy(() => import('@/pages/MasteryListPages').then((m) => ({ default: m.MasteryQuestsPage })))
const MasteryBadgesPage = lazy(() => import('@/pages/MasteryListPages').then((m) => ({ default: m.MasteryBadgesPage })))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const LandmarkPage = lazy(() => import('@/pages/LandmarkPage'))
const ChatPage = lazy(() => import('@/pages/ChatPage'))
const WelcomePage = lazy(() => import('@/pages/WelcomePage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const LoginPage = lazy(() => import('@/pages/AuthPages').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/AuthPages').then((m) => ({ default: m.RegisterPage })))

const page = (element: ReactNode) => <Suspense fallback={<Loading />}>{element}</Suspense>

/** Sends first-time visitors to the splash, then the welcome screen. */
function FirstRun({ children }: { children: ReactNode }) {
  const { onboarded } = usePreferences()
  return onboarded ? children : <Navigate to="/splash" replace />
}

export const routes: RouteObject[] = [
  {
    element: (
      <FirstRun>
        <AppShell />
      </FirstRun>
    ),
    children: [
      { index: true, element: <ExplorePage /> },
      { path: 'archives', element: page(<ArchivesPage />) },
      { path: 'scan', element: page(<ScanPage />) },
      { path: 'mastery', element: page(<MasteryPage />) },
      // "See all" screens keep the bottom nav with Mastery active, as in Figma.
      { path: 'mastery/quests', element: page(<MasteryQuestsPage />) },
      { path: 'mastery/badges', element: page(<MasteryBadgesPage />) },
      { path: 'profile', element: page(<ProfilePage />) },
    ],
  },
  { path: 'landmarks/:id', element: page(<LandmarkPage />) },
  { path: 'landmarks/:id/chat', element: page(<ChatPage />) },
  { path: 'splash', element: page(<SplashScreenPage />) },
  { path: 'welcome', element: page(<WelcomePage />) },
  { path: 'login', element: page(<LoginPage />) },
  { path: 'register', element: page(<RegisterPage />) },
  { path: '*', element: page(<NotFoundPage />) },
]
