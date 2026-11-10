import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useMe, useUpdateMe } from '@/api/hooks'
import type { Me } from '@/api/types'
import { SignInPrompt } from '@/components/SignInPrompt'
import { ErrorMessage, Loading } from '@/components/StateMessage'
import { TopNavbar } from '@/components/TopNavbar'
import {
  CameraOutlineIcon,
  CheckmarkOutlineIcon,
  ChevronForwardOutlineIcon,
  CloseOutlineIcon,
  CreateOutlineIcon,
  FlameOutlineIcon,
  GlobeOutlineIcon,
  HelpCircleOutlineIcon,
  InformationCircleOutlineIcon,
  LocationOutlineIcon,
  LockClosedOutlineIcon,
  LogOutOutlineIcon,
  MailOutlineIcon,
  MoonOutlineIcon,
  NotificationsOutlineIcon,
  PersonOutlineIcon,
  RibbonOutlineIcon,
  ShieldCheckmarkOutlineIcon,
  TrashOutlineIcon,
} from '@/components/icons/ionicons'
import { useAuth } from '@/features/auth/AuthContext'
import { resetBookmarksCache } from '@/features/bookmarks/useBookmarks'
import { levelProgress } from '@/features/mastery/progress'
import { usePreferences, type ThemeMode } from '@/features/preferences/PreferencesContext'
import { GRANTED_KEY } from '@/hooks/useGeolocation'
import { env } from '@/lib/env'
import { clearOfflineCache, readJson, writeJson } from '@/lib/storage'

type LanguageOption = {
  code: 'en' | 'ceb'
  name: string
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English' },
  { code: 'ceb', name: 'Cebuano' },
]

type PermissionId = 'camera' | 'location'
type PermissionStatus = 'granted' | 'denied' | 'prompt'

type PermissionMeta = {
  id: PermissionId
  title: string
  description: string
}

const PERMISSION_ITEMS: PermissionMeta[] = [
  {
    id: 'camera',
    title: 'Camera',
    description: 'Scan landmarks and hear their stories',
  },
  {
    id: 'location',
    title: 'Location',
    description: 'Sort nearby landmarks and verify scans',
  },
]

const STATUS_PILL: Record<PermissionStatus, { label: string; className: string }> = {
  granted: { label: 'Allowed', className: 'bg-sage-soft text-sage-deep' },
  denied: { label: 'Blocked', className: 'bg-terracotta-soft text-terracotta-ink' },
  prompt: { label: 'Not enabled', className: 'bg-navy-soft text-navy' },
}

async function queryBrowserPermission(id: PermissionId): Promise<PermissionStatus> {
  const name = id === 'camera' ? ('camera' as PermissionName) : 'geolocation'
  const state = await navigator.permissions
    ?.query({ name })
    .then((status) => status.state)
    .catch(() => undefined)
  if (id === 'location' && state === 'granted' && !readJson(GRANTED_KEY, false)) {
    return 'prompt'
  }
  if (state === 'granted' || state === 'denied') return state
  return 'prompt'
}

async function requestBrowserPermission(id: PermissionId): Promise<PermissionStatus> {
  if (id === 'camera') {
    if (!navigator.mediaDevices) return 'denied'
    const ok = await navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        stream.getTracks().forEach((track) => track.stop())
        return true
      })
      .catch(() => false)
    if (ok) return 'granted'
    return queryBrowserPermission('camera')
  }

  if (!('geolocation' in navigator)) return 'denied'
  writeJson(GRANTED_KEY, true)
  const ok = await new Promise<boolean>((resolve) =>
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => resolve(false),
      { timeout: 10_000 },
    ),
  )
  if (ok) return 'granted'
  return queryBrowserPermission('location')
}

export default function ProfilePage() {
  const auth = useAuth()
  const me = useMe()
  const updateMe = useUpdateMe()
  const prefs = usePreferences()
  const queryClient = useQueryClient()

  // Real browser permission states (Location defaults to 'prompt' until rationale is accepted & browser grants it)
  const [permissionStates, setPermissionStates] = useState<Record<PermissionId, PermissionStatus>>({
    camera: 'prompt',
    location: 'prompt',
  })
  const [requestingPerm, setRequestingPerm] = useState<PermissionId | null>(null)

  useEffect(() => {
    if (!navigator.permissions?.query) return
    let active = true
    Promise.all([queryBrowserPermission('camera'), queryBrowserPermission('location')]).then(
      ([camera, location]) => {
        if (active) {
          setPermissionStates((prev) =>
            prev.camera === camera && prev.location === location ? prev : { camera, location },
          )
        }
      },
    )
    return () => {
      active = false
    }
  }, [])

  // Modals & sub-views
  const [currentView, setCurrentView] = useState<'profile' | 'permissions'>('profile')
  const [isLanguageOpen, setIsLanguageOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [cacheCleared, setCacheCleared] = useState(false)

  const isDarkMode = prefs.resolvedTheme === 'dark'
  const notificationsEnabled = prefs.questNotices && prefs.streakReminders && prefs.proximityAlerts

  const toggleTheme = () => {
    const nextTheme: ThemeMode = isDarkMode ? 'light' : 'dark'
    prefs.update({ theme: nextTheme })
  }

  const toggleNotifications = () => {
    const next = !notificationsEnabled
    prefs.update({ questNotices: next, streakReminders: next, proximityAlerts: next })
  }

  const handleSelectLanguage = (language: 'en' | 'ceb') => {
    prefs.update({ language })
    if (auth.status === 'signed-in') {
      updateMe.mutate({ language })
    }
    setIsLanguageOpen(false)
  }

  const handleRequestPermission = async (id: PermissionId) => {
    setRequestingPerm(id)
    const next = await requestBrowserPermission(id)
    setPermissionStates((prev) => ({ ...prev, [id]: next }))
    setRequestingPerm(null)
  }

  const handleClearCache = () => {
    clearOfflineCache()
    resetBookmarksCache()
    queryClient.clear()
    setCacheCleared(true)
  }

  const handleConfirmLogout = () => {
    setIsLogoutConfirmOpen(false)
    auth.signOut()
  }

  const allowedPermissionsCount = Object.values(permissionStates).filter((s) => s === 'granted').length
  const currentLangLabel = LANGUAGES.find((l) => l.code === prefs.language)?.name ?? 'English'

  if (currentView === 'permissions') {
    return (
      <div className="bleed-under-nav relative min-h-dvh bg-ivory text-ink transition-colors duration-200">
        <PermissionsSubpage
          permissionStates={permissionStates}
          requestingPerm={requestingPerm}
          onRequestPermission={handleRequestPermission}
          onBack={() => setCurrentView('profile')}
        />
      </div>
    )
  }

  return (
    <div className="bleed-under-nav relative min-h-dvh bg-ivory text-ink transition-colors duration-200">
      {/* Decorative ambient washes, drawn with palette tokens so they follow the theme. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-24 top-10 h-64 w-64 rounded-full bg-sage-soft/40 blur-3xl" />
        <div className="absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-terracotta-soft/40 blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto max-w-md px-4 pt-6 focus:outline-none">
        {/* Header Section */}
        <header className="mb-6">
          <div className="mb-1 text-xs font-bold tracking-[0.1em] text-terracotta-ink uppercase">
            Your account
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            Profile
          </h1>
        </header>

        {/* ========================================================
            SECTIONS 1–3: AUTHENTICATED TRAVELER PROFILE
           ======================================================== */}
        <div className="mb-6">
          {auth.status !== 'signed-in' ? (
            <SignInPrompt message="Sign in to set up your traveler profile." />
          ) : me.isPending ? (
            <Loading />
          ) : me.isError ? (
            <ErrorMessage error={me.error} onRetry={() => me.refetch()} />
          ) : (
            <AuthenticatedProfileContent me={me.data} />
          )}
        </div>

        {/* ========================================================
            SECTION 4: PREFERENCES & SETTINGS CARD
           ======================================================== */}
        <section aria-labelledby="preferences-title" className="mb-6">
          <div className="mb-2">
            <h2 id="preferences-title" className="text-xs font-bold tracking-wider text-terracotta-ink uppercase">
              Preferences
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Personalize your Laag ta bAI experience.
            </p>
          </div>

          <div className="space-y-2 rounded-3xl border border-ivory-line bg-ivory-surface p-2 shadow-xs">
            {/* Language Row */}
            <button
              type="button"
              onClick={() => setIsLanguageOpen(true)}
              className="touch-target flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-ivory/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
              aria-label={`Language, current selection: ${currentLangLabel}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-terracotta-soft text-terracotta-ink">
                  <GlobeOutlineIcon size={18} />
                </span>
                <div className="min-w-0">
                  <span className="block text-sm font-bold text-ink">Language</span>
                  <span className="block truncate text-xs text-ink-muted">App language and translations</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-ink-body">
                <span>{currentLangLabel}</span>
                <ChevronForwardOutlineIcon size={16} className="text-ink-muted" />
              </div>
            </button>

            {/* Permissions Row */}
            <button
              type="button"
              onClick={() => setCurrentView('permissions')}
              className="touch-target flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-ivory/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
              aria-label={`Permissions, ${allowedPermissionsCount} allowed`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-terracotta-soft text-terracotta-ink">
                  <ShieldCheckmarkOutlineIcon size={18} />
                </span>
                <div className="min-w-0">
                  <span className="block text-sm font-bold text-ink">Permissions</span>
                  <span className="block truncate text-xs text-ink-muted">Camera and location access</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-ink-body">
                <span>{allowedPermissionsCount} allowed</span>
                <ChevronForwardOutlineIcon size={16} className="text-ink-muted" />
              </div>
            </button>

            {/* Notifications Toggle Row */}
            <div className="flex min-h-14 items-center justify-between gap-3 rounded-2xl p-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-terracotta-soft text-terracotta-ink">
                  <NotificationsOutlineIcon size={18} />
                </span>
                <div className="min-w-0">
                  <span className="block text-sm font-bold text-ink">Notifications</span>
                  <span className="block truncate text-xs text-ink-muted">Quests, streaks, and nearby places</span>
                </div>
              </div>
              <AccessibleToggle
                id="notifications-toggle"
                label="Notifications"
                checked={notificationsEnabled}
                onToggle={toggleNotifications}
              />
            </div>

            {/* Dark Mode Toggle Row */}
            <div className="flex min-h-14 items-center justify-between gap-3 rounded-2xl p-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-terracotta-soft text-terracotta-ink">
                  <MoonOutlineIcon size={18} />
                </span>
                <div className="min-w-0">
                  <span className="block text-sm font-bold text-ink">Dark mode</span>
                  <span className="block truncate text-xs text-ink-muted">Use the dark heritage theme</span>
                </div>
              </div>
              <AccessibleToggle
                id="dark-theme-toggle"
                label="Dark theme"
                checked={isDarkMode}
                onToggle={toggleTheme}
              />
            </div>

            {/* Offline Storage Row */}
            <div className="flex min-h-14 items-center justify-between gap-3 rounded-2xl p-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sage-soft text-sage-deep">
                  <TrashOutlineIcon size={18} />
                </span>
                <div className="min-w-0">
                  <span className="block text-sm font-bold text-ink">Offline storage</span>
                  <span className="block truncate text-xs text-ink-muted">Cached landmarks and saved data</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearCache}
                className="touch-target flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl px-3 text-xs font-bold text-terracotta-ink transition-colors hover:bg-terracotta-soft/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
              >
                {cacheCleared ? 'Cleared' : 'Clear cache'}
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================
            SECTION 5: SUPPORT & ABOUT
           ======================================================== */}
        <section aria-labelledby="support-title" className="mb-6">
          <div className="mb-2">
            <h2 id="support-title" className="text-xs font-bold tracking-wider text-terracotta-ink uppercase">
              Support & about
            </h2>
          </div>

          <div className="space-y-2 rounded-3xl border border-ivory-line bg-ivory-surface p-2 shadow-xs">
            {/* Help Center */}
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="touch-target flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-ivory/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sage-soft text-sage-deep">
                  <HelpCircleOutlineIcon size={18} />
                </span>
                <div className="min-w-0">
                  <span className="block text-sm font-bold text-ink">Help center</span>
                  <span className="block truncate text-xs text-ink-muted">FAQs, permissions, and support</span>
                </div>
              </div>
              <ChevronForwardOutlineIcon size={16} className="text-ink-muted" />
            </button>

            {/* About App */}
            <button
              type="button"
              onClick={() => setIsAboutOpen(true)}
              className="touch-target flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-ivory/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sage-soft text-sage-deep">
                  <InformationCircleOutlineIcon size={18} />
                </span>
                <div className="min-w-0">
                  <span className="block text-sm font-bold text-ink">About the app</span>
                  <span className="block truncate text-xs text-ink-muted">Privacy, terms, and acknowledgements</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-ink-body">
                <span>v{env.appVersion || '1.0.0'}</span>
                <ChevronForwardOutlineIcon size={16} className="text-ink-muted" />
              </div>
            </button>
          </div>
        </section>

        {/* ========================================================
            SECTION 6: ABOUT THE DEVELOPER (CLEARLY SEPARATED)
           ======================================================== */}
        <section aria-labelledby="developer-title" className="mb-6">
          <div className="mb-2">
            <h2 id="developer-title" className="text-xs font-bold tracking-wider text-terracotta-ink uppercase">
              About the developer
            </h2>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-ivory-line bg-ivory-surface p-5 shadow-xs">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-terracotta" aria-hidden="true" />
            <div className="pl-2">
              <div className="mb-2 flex items-center gap-1">
                <span className="text-xs font-black tracking-widest text-ink">LAAG TA</span>
                <span className="text-base font-black text-terracotta-ink">bAI</span>
              </div>
              <p className="text-xs leading-relaxed font-medium text-ink-body">
                Your AI-powered companion for discovering the stories, places, and culture of Cebu.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                Crafted by student developers and Cebuano heritage enthusiasts to preserve local history through modern agentic mobile technology.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================
            SECTION 7: LOG OUT (SIGNED-IN TRAVELERS)
           ======================================================== */}
        {auth.status === 'signed-in' && (
          <section aria-label="Account management actions" className="mb-6">
            <button
              type="button"
              onClick={() => setIsLogoutConfirmOpen(true)}
              className="touch-target flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-ivory-line bg-ivory-surface px-4 py-2.5 text-xs font-bold text-ink transition-colors hover:bg-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              <LogOutOutlineIcon size={18} />
              <span>Log out</span>
            </button>
          </section>
        )}
      </main>

      {/* ========================================================
          MODAL: CHOOSE LANGUAGE
         ======================================================== */}
      {isLanguageOpen && (
        <ChooseLanguageModal
          currentLanguage={prefs.language}
          onSelectLanguage={handleSelectLanguage}
          onClose={() => setIsLanguageOpen(false)}
        />
      )}

      {/* ========================================================
          MODAL: HELP CENTER
         ======================================================== */}
      {isHelpOpen && <HelpCenterModal onClose={() => setIsHelpOpen(false)} />}

      {/* ========================================================
          MODAL: ABOUT LAAG TA bAI
         ======================================================== */}
      {isAboutOpen && <AboutAppModal onClose={() => setIsAboutOpen(false)} />}

      {/* ========================================================
          MODAL: CONFIRM LOG OUT
         ======================================================== */}
      {isLogoutConfirmOpen && (
        <ConfirmActionModal
          title="Log out?"
          message="Are you sure you want to log out of your Laag ta bAI account?"
          confirmLabel="Log out"
          onConfirm={handleConfirmLogout}
          onCancel={() => setIsLogoutConfirmOpen(false)}
        />
      )}
    </div>
  )
}

/* =========================================================================
   AUTHENTICATED PROFILE CONTENT (WIRED TO useMe() / useUpdateMe())
   ========================================================================= */

function AuthenticatedProfileContent({ me }: { me: Me }) {
  const updateMe = useUpdateMe()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editFormData, setEditFormData] = useState({
    displayName: me.profile.displayName,
    nationality: me.profile.nationality ?? '',
    bio: me.profile.bio ?? '',
  })
  const [validationError, setValidationError] = useState<string | null>(null)

  const displayName = me.profile.displayName.trim() || 'Unnamed traveler'
  const initials =
    me.profile.displayName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'

  const level = levelProgress(me.rank)
  const progressPercent = level
    ? Math.min(100, Math.max(0, Math.round((level.into / Math.max(1, level.span)) * 100)))
    : 100
  const xpRemaining = me.rank.nextLevelXp !== null ? Math.max(0, me.rank.nextLevelXp - me.rank.xp) : 0

  const handleToggleEdit = () => {
    setValidationError(null)
    setIsEditOpen((prev) => {
      const next = !prev
      if (next) {
        setEditFormData({
          displayName: me.profile.displayName,
          nationality: me.profile.nationality ?? '',
          bio: me.profile.bio ?? '',
        })
      }
      return next
    })
  }

  const handleCancelEdit = () => {
    setValidationError(null)
    setEditFormData({
      displayName: me.profile.displayName,
      nationality: me.profile.nationality ?? '',
      bio: me.profile.bio ?? '',
    })
    setIsEditOpen(false)
  }

  const handleSaveProfile = (e: FormEvent) => {
    e.preventDefault()
    const trimmedName = editFormData.displayName.trim()
    if (!trimmedName) {
      setValidationError('Display name is required.')
      return
    }
    setValidationError(null)
    updateMe.mutate(
      {
        displayName: trimmedName,
        nationality: editFormData.nationality.trim() || null,
        bio: editFormData.bio.trim() || null,
      },
      {
        onSuccess: () => setIsEditOpen(false),
      },
    )
  }

  return (
    <>
      {/* SECTION 1: PROFILE CARD */}
      <section
        aria-label="Profile information"
        className="mb-4 rounded-3xl border border-ivory-line bg-ivory-surface p-5 shadow-xs"
      >
        <div className="flex items-start justify-between gap-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            {me.profile.avatarUrl ? (
              <img
                src={me.profile.avatarUrl}
                alt={`Profile picture of ${displayName}`}
                className="size-20 rounded-full border-2 border-terracotta object-cover"
              />
            ) : (
              <div
                role="img"
                aria-label={`Avatar for ${displayName}: initials ${initials}`}
                className="flex size-20 items-center justify-center rounded-full bg-terracotta text-2xl font-black text-on-navy shadow-xs select-none"
              >
                {initials}
              </div>
            )}
          </div>

          {/* Profile Name & Rank Details */}
          <div className="min-w-0 flex-1 pl-1">
            <span className="block truncate text-xs font-bold tracking-wider text-terracotta-ink uppercase">
              {me.rank.title} · LEVEL {me.rank.level}
            </span>
            <h2 className="mt-0.5 truncate text-xl font-black break-words text-ink">
              {displayName}
            </h2>
            {me.email && (
              <p className="mt-0.5 truncate text-xs break-words text-ink-muted">
                {me.email}
              </p>
            )}
            {me.profile.nationality && (
              <p className="mt-0.5 truncate text-xs break-words text-ink-muted">
                {me.profile.nationality}
              </p>
            )}
            <p className="mt-1 line-clamp-2 text-xs break-words text-ink-muted">
              {me.profile.bio ? me.profile.bio : <span className="italic">No travel bio yet.</span>}
            </p>
          </div>

          {/* Edit / Editing Button */}
          <button
            type="button"
            onClick={handleToggleEdit}
            aria-expanded={isEditOpen}
            aria-controls="edit-profile-section"
            className={`touch-target flex min-h-12 min-w-12 shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
              isEditOpen
                ? 'border-terracotta bg-terracotta-soft text-terracotta-ink shadow-2xs'
                : 'border-ivory-line bg-ivory/60 text-ink hover:bg-ivory'
            }`}
            aria-label={isEditOpen ? 'Editing profile details' : 'Edit profile details'}
          >
            <CreateOutlineIcon size={16} />
            <span>{isEditOpen ? 'Editing' : 'Edit'}</span>
          </button>
        </div>

        {me.badges.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2 border-t border-ivory-line pt-3" aria-label="Earned badges">
            {me.badges.map((badge) => (
              <li
                key={badge.questId}
                className="inline-flex items-center gap-1.5 rounded-full bg-terracotta-soft px-3 py-1 text-xs font-bold text-terracotta-ink"
              >
                <RibbonOutlineIcon size={14} />
                <span>{badge.name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* INLINE EDIT PROFILE DROPDOWN COMPONENT */}
      {isEditOpen && (
        <section
          id="edit-profile-section"
          aria-label="Edit profile details"
          className="mb-4 overflow-hidden rounded-3xl border border-terracotta/30 bg-ivory-surface p-5 shadow-xs transition-all"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold tracking-wider text-terracotta-ink uppercase">
                Personal details
              </div>
              <h3 className="mt-0.5 text-lg font-black text-ink">
                Edit profile
              </h3>
            </div>
            <button
              type="button"
              onClick={handleCancelEdit}
              aria-label="Close profile editor"
              className="touch-target flex size-12 min-h-12 min-w-12 items-center justify-center rounded-full bg-ivory-surface text-ink-muted transition-colors hover:bg-ivory-line/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              <CloseOutlineIcon size={20} />
            </button>
          </div>

          <form onSubmit={handleSaveProfile} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="edit-display-name"
                className="mb-1.5 block text-xs font-bold tracking-wider text-terracotta-ink uppercase"
              >
                Display name
              </label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3.5 text-terracotta">
                  <PersonOutlineIcon size={18} />
                </span>
                <input
                  id="edit-display-name"
                  name="displayName"
                  type="text"
                  required
                  maxLength={60}
                  value={editFormData.displayName}
                  onChange={(e) => {
                    setValidationError(null)
                    setEditFormData((prev) => ({ ...prev, displayName: e.target.value }))
                  }}
                  className="h-12 w-full rounded-2xl border border-line-strong bg-ivory pr-4 pl-10 text-sm font-semibold text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-navy"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="edit-nationality"
                className="mb-1.5 block text-xs font-bold tracking-wider text-terracotta-ink uppercase"
              >
                Nationality
              </label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3.5 text-terracotta">
                  <GlobeOutlineIcon size={18} />
                </span>
                <input
                  id="edit-nationality"
                  name="nationality"
                  type="text"
                  maxLength={60}
                  value={editFormData.nationality}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, nationality: e.target.value }))}
                  placeholder="e.g. Filipino"
                  className="h-12 w-full rounded-2xl border border-line-strong bg-ivory pr-4 pl-10 text-sm font-semibold text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-navy"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="edit-travel-bio"
                className="mb-1.5 block text-xs font-bold tracking-wider text-terracotta-ink uppercase"
              >
                Travel bio
              </label>
              <textarea
                id="edit-travel-bio"
                name="bio"
                rows={3}
                maxLength={280}
                value={editFormData.bio}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell others about your travels in Cebu..."
                className="w-full resize-none rounded-2xl border border-line-strong bg-ivory p-3 text-sm font-semibold text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-navy"
              />
            </div>

            {validationError && (
              <p role="alert" className="text-xs font-semibold text-danger">
                {validationError}
              </p>
            )}

            {updateMe.isError && <ErrorMessage error={updateMe.error} />}

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="touch-target flex min-h-12 items-center justify-center rounded-xl border border-ivory-line px-5 py-2 text-sm font-bold text-ink transition-colors hover:bg-ivory focus-visible:outline-2 focus-visible:outline-navy"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateMe.isPending}
                className="touch-target flex min-h-12 items-center gap-1.5 rounded-xl bg-navy px-5 py-2 text-sm font-bold text-on-navy shadow-sm transition-colors hover:bg-navy-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:opacity-60"
              >
                <CheckmarkOutlineIcon size={16} />
                <span>{updateMe.isPending ? 'Saving…' : 'Save changes'}</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* SECTION 2: STATS SUMMARY (VISITED, BADGES, STREAK) */}
      <section aria-label="Exploration statistics" className="mb-4 grid grid-cols-3 gap-2.5">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-ivory-line bg-ivory-surface p-3 text-center shadow-2xs">
          <span className="text-xl font-black text-ink">{me.stats.visitedCount}</span>
          <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-ink-muted">
            <LocationOutlineIcon size={14} className="shrink-0 text-terracotta" />
            <span className="truncate">Places visited</span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-ivory-line bg-ivory-surface p-3 text-center shadow-2xs">
          <span className="text-xl font-black text-ink">{me.badges.length}</span>
          <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-ink-muted">
            <RibbonOutlineIcon size={14} className="shrink-0 text-sage-deep" />
            <span className="truncate">Badges earned</span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-ivory-line bg-ivory-surface p-3 text-center shadow-2xs">
          <span className="text-xl font-black text-ink">{me.stats.streakCount}</span>
          <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-ink-muted">
            <FlameOutlineIcon size={14} className="shrink-0 text-terracotta" />
            <span className="truncate">Day streak</span>
          </div>
        </div>
      </section>

      {/* SECTION 3: JOURNEY PROGRESS (LEVEL & XP) */}
      <section
        aria-label="Level progress"
        className=" rounded-3xl border border-navy/15 bg-navy p-5 text-on-navy shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold tracking-wider text-on-navy/80 uppercase">
              Your journey
            </span>
            <h2 className="mt-0.5 text-lg font-black tracking-tight text-on-navy">
              Level {me.rank.level} progress
            </h2>
          </div>
          <span className="text-sm font-extrabold text-on-navy">
            {me.rank.xp.toLocaleString()} XP
          </span>
        </div>

        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress to level ${me.rank.level + 1}`}
          className="mt-3.5 h-3 w-full overflow-hidden rounded-full bg-navy-soft"
        >
          <div
            className="h-full rounded-full bg-terracotta transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="mt-2 text-xs font-medium text-on-navy/80">
          {me.rank.nextLevelXp !== null
            ? `${xpRemaining.toLocaleString()} XP to reach Level ${me.rank.level + 1}`
            : 'You reached the top rank.'}
        </p>
      </section>
    </>
  )
}

/* =========================================================================
   SUBCOMPONENTS & ACCESSIBLE TOGGLE
   ========================================================================= */

/** Accessible Toggle switch that indicates on/off by position, label, and accessible state (not color alone) */
function AccessibleToggle({
  id,
  label,
  checked,
  onToggle,
}: {
  id: string
  label: string
  checked: boolean
  onToggle: () => void
}) {
  const generatedId = useId()
  const toggleId = id || generatedId

  return (
    <button
      id={toggleId}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`${label}, ${checked ? 'on' : 'off'}`}
      onClick={onToggle}
      className="touch-target group relative inline-flex min-h-12 min-w-12 cursor-pointer touch-manipulation items-center justify-center rounded-full p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
    >
      <span
        aria-hidden="true"
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border p-0.5 transition-colors duration-200 ease-in-out ${
          checked
            ? 'border-navy bg-navy'
            : 'border-line-strong bg-ivory-line'
        }`}
      >
        <span
          className={`pointer-events-none block size-5.5 rounded-full shadow-xs transition-transform duration-200 ease-in-out ${
            checked
              ? 'translate-x-5 bg-on-navy'
              : 'translate-x-0 border border-line-strong bg-ivory-surface'
          }`}
        />
      </span>
    </button>
  )
}

/** Choose Language Modal */
function ChooseLanguageModal({
  currentLanguage,
  onSelectLanguage,
  onClose,
}: {
  currentLanguage: 'en' | 'ceb'
  onSelectLanguage: (code: 'en' | 'ceb') => void
  onClose: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="choose-lang-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-xs"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="w-full max-w-sm rounded-3xl border border-ivory-line bg-ivory p-6 text-ink shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold tracking-wider text-terracotta-ink uppercase">
              App language
            </div>
            <h2 id="choose-lang-title" className="text-xl font-black text-ink">
              Choose language
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close language selector"
            className="touch-target flex size-12 min-h-12 min-w-12 items-center justify-center rounded-full bg-ivory-surface text-ink-muted transition-colors hover:bg-ivory-line/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            <CloseOutlineIcon size={20} />
          </button>
        </div>

        <div role="radiogroup" aria-label="Available app languages" className="space-y-2">
          {LANGUAGES.map((lang) => {
            const isSelected = currentLanguage === lang.code
            return (
              <button
                key={lang.code}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelectLanguage(lang.code)}
                className={`touch-target flex min-h-12 w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
                  isSelected
                    ? 'border-navy bg-navy-soft text-ink'
                    : 'border-ivory-line bg-ivory-surface text-ink hover:bg-ivory/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <GlobeOutlineIcon size={18} className="shrink-0 text-terracotta" />
                  <span>{lang.name}</span>
                </div>
                {isSelected && (
                  <CheckmarkOutlineIcon size={18} className="shrink-0 font-bold text-navy" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Permissions Subpage using shared TopNavbar and real navigator.permissions.query() state */
function PermissionsSubpage({
  permissionStates,
  requestingPerm,
  onRequestPermission,
  onBack,
}: {
  permissionStates: Record<PermissionId, PermissionStatus>
  requestingPerm: PermissionId | null
  onRequestPermission: (id: PermissionId) => void
  onBack: () => void
}) {
  return (
    <div>
      <TopNavbar title="Permissions" titleAs="h1" backLabel="Back to profile" onBack={onBack} />
      <main className="relative z-10 mx-auto max-w-md px-4 pt-6 pb-8 focus:outline-none">
        <div className="space-y-3.5">
          {/* You're in control banner */}
          <section
            aria-label="Privacy control"
            className="flex items-center gap-3.5 rounded-3xl border border-sage/40 bg-sage-soft p-4.5"
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sage-deep text-ivory-surface shadow-2xs">
              <ShieldCheckmarkOutlineIcon size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-ink">You&apos;re in control</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                See what Laag ta bAI can access on your device. Location is only requested after you choose to allow it.
              </p>
            </div>
          </section>

          {/* Permission item cards */}
          <section aria-label="Permission items" className="space-y-3">
            {PERMISSION_ITEMS.map((p) => {
              const status = permissionStates[p.id]
              const pill = STATUS_PILL[status]
              const isAsking = requestingPerm === p.id
              return (
                <article
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-ivory-line bg-ivory-surface p-4 shadow-2xs"
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-terracotta-soft text-terracotta-ink">
                      {p.id === 'location' && <LocationOutlineIcon size={20} />}
                      {p.id === 'camera' && <CameraOutlineIcon size={20} />}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-ink">{p.title}</h3>
                      <p className="mt-0.5 truncate text-xs text-ink-muted">{p.description}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${pill.className}`}>
                      {pill.label}
                    </span>
                    {status === 'prompt' && (
                      <button
                        type="button"
                        disabled={isAsking}
                        onClick={() => onRequestPermission(p.id)}
                        aria-label={`Allow ${p.title}`}
                        className="touch-target flex min-h-12 min-w-12 items-center justify-center rounded-xl bg-navy px-3 text-xs font-bold text-on-navy transition-colors hover:bg-navy-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:opacity-60"
                      >
                        {isAsking ? 'Asking…' : 'Allow'}
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </section>

          {/* Privacy Note */}
          <aside
            aria-label="Privacy note"
            className="flex items-start gap-3 rounded-2xl border border-terracotta/20 bg-terracotta-soft p-4 text-xs text-ink"
          >
            <LockClosedOutlineIcon size={18} className="mt-0.5 shrink-0 text-terracotta-ink" />
            <p className="leading-relaxed text-ink-body">
              We use your location only to sort nearby landmarks and verify scans. Coordinates are sent to the API only for those features and are never sold. To revoke an allowed or blocked permission, update it in your browser settings.
            </p>
          </aside>

          {/* Actions */}
          <div className="space-y-2.5 pt-2 pb-2">
            <Link
              to="/permissions"
              state={{ next: '/profile' }}
              className="touch-target flex min-h-12 w-full items-center justify-center rounded-2xl border border-ivory-line bg-ivory-surface px-4 text-sm font-bold text-ink transition-colors hover:bg-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              Open permissions setup
            </Link>
            <button
              type="button"
              onClick={onBack}
              className="touch-target flex min-h-12 w-full items-center justify-center rounded-2xl bg-navy text-base font-bold text-on-navy shadow-sm transition-colors hover:bg-navy-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              Done
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

/** Help Center Modal */
function HelpCenterModal({ onClose }: { onClose: () => void }) {
  const faqs = [
    {
      q: 'How does landmark scanning work?',
      a: 'Open Scan, point your camera at a landmark, and bAI will match it with a Cebu story.',
    },
    {
      q: 'Can I use the app offline?',
      a: 'Bookmarked places and stories stay available offline for reading without a connection.',
    },
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-center-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-xs"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="w-full max-w-sm rounded-3xl border border-ivory-line bg-ivory p-6 text-ink shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold tracking-wider text-terracotta-ink uppercase">
              Support
            </div>
            <h2 id="help-center-title" className="text-xl font-black text-ink">
              Help center
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help center"
            className="touch-target flex size-12 min-h-12 min-w-12 items-center justify-center rounded-full bg-ivory-surface text-ink-muted transition-colors hover:bg-ivory-line/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            <CloseOutlineIcon size={20} />
          </button>
        </div>

        <div className="mb-5 space-y-3">
          {faqs.map((faq) => (
            <article key={faq.q} className="rounded-2xl border border-sage/30 bg-sage-soft p-3.5">
              <h3 className="text-xs font-bold text-ink">{faq.q}</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">{faq.a}</p>
            </article>
          ))}
        </div>

        <a
          href="mailto:support@laagtabai.com"
          className="touch-target flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-navy text-sm font-bold text-on-navy shadow-sm transition-colors hover:bg-navy-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          <MailOutlineIcon size={18} />
          <span>Contact support</span>
        </a>
      </div>
    </div>
  )
}

/** About App Modal */
function AboutAppModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-xs"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="w-full max-w-sm rounded-3xl border border-ivory-line bg-ivory p-6 text-ink shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold tracking-wider text-terracotta-ink uppercase">
              About
            </div>
            <h2 id="about-dialog-title" className="text-xl font-black text-ink">
              About Laag ta bAI
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close about dialog"
            className="touch-target flex size-12 min-h-12 min-w-12 items-center justify-center rounded-full bg-ivory-surface text-ink-muted transition-colors hover:bg-ivory-line/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            <CloseOutlineIcon size={20} />
          </button>
        </div>

        <div className="mb-3 flex items-center gap-1.5 rounded-2xl border border-sage/30 bg-sage-soft p-3">
          <span className="text-xs font-black tracking-widest text-ink">LAAG TA</span>
          <span className="text-sm font-black text-terracotta-ink">bAI</span>
        </div>

        <p className="mb-4 text-xs leading-relaxed text-ink-muted">
          Laag ta bAI is an AI-powered companion for discovering Cebu&apos;s heritage through places, photos, and local stories.
        </p>

        <div className="mb-5 space-y-2.5">
          <div className="rounded-2xl border border-sage/30 bg-sage-soft p-3">
            <h3 className="text-xs font-bold text-ink">Version</h3>
            <p className="mt-0.5 text-xs text-ink-muted">v{env.appVersion || '1.0.0'}</p>
          </div>

          <div className="rounded-2xl border border-sage/30 bg-sage-soft p-3">
            <h3 className="text-xs font-bold text-ink">Privacy</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
              Your saved discoveries and profile preferences stay private to your account.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="touch-target flex min-h-12 w-full items-center justify-center rounded-2xl bg-navy text-sm font-bold text-on-navy shadow-sm transition-colors hover:bg-navy-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          Close
        </button>
      </div>
    </div>
  )
}

/** Confirmation Modal for Log Out */
function ConfirmActionModal({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-xs"
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
    >
      <div className="w-full max-w-sm rounded-3xl border border-ivory-line bg-ivory p-6 text-ink shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold tracking-wider text-terracotta-ink uppercase">
              Account
            </div>
            <h2 id="confirm-modal-title" className="text-xl font-black text-ink">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="touch-target flex size-12 min-h-12 min-w-12 items-center justify-center rounded-full bg-ivory-surface text-ink-muted transition-colors hover:bg-ivory-line/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            <CloseOutlineIcon size={20} />
          </button>
        </div>

        <div className="my-3 flex justify-center">
          <div className="flex size-14 items-center justify-center rounded-full border border-navy/20 bg-navy-soft text-navy">
            <LogOutOutlineIcon size={24} />
          </div>
        </div>

        <p id="confirm-modal-desc" className="mb-6 text-center text-xs leading-relaxed text-ink-muted">
          {message}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="touch-target flex min-h-12 items-center justify-center rounded-xl border border-ivory-line text-sm font-bold text-ink transition-colors hover:bg-ivory-surface focus-visible:outline-2 focus-visible:outline-navy"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="touch-target flex min-h-12 items-center justify-center rounded-xl bg-navy text-sm font-bold text-on-navy shadow-sm transition-colors hover:bg-navy-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
