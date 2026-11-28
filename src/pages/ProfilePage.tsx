import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useMe, useUpdateMe } from '@/api/hooks'
import type { Me } from '@/api/types'
import { NationalitySelect } from '@/components/NationalitySelect'
import { SignInPrompt } from '@/components/SignInPrompt'
import { ErrorMessage, Loading } from '@/components/StateMessage'
import { TopNavbar } from '@/components/TopNavbar'
import {
  CameraOutlineIcon,
  CheckmarkIcon,
  ChevronForwardOutlineIcon,
  CloseOutlineIcon,
  CloudOfflineOutlineIcon,
  CreateOutlineIcon,
  FlameIcon,
  GlobeOutlineIcon,
  HelpCircleOutlineIcon,
  InformationCircleOutlineIcon,
  LocationIcon,
  LocationOutlineIcon,
  LockClosedOutlineIcon,
  LogOutOutlineIcon,
  MailOutlineIcon,
  MoonIcon,
  MoonOutlineIcon,
  NotificationsIcon,
  PersonOutlineIcon,
  RibbonIcon,
  RibbonOutlineIcon,
  ShieldCheckmarkIcon,
} from '@/components/icons/ionicons'
import { useAuth } from '@/features/auth/AuthContext'
import { resetBookmarksCache } from '@/features/bookmarks/useBookmarks'
import { levelProgress } from '@/features/mastery/progress'
import { usePreferences, type ThemeMode } from '@/features/preferences/PreferencesContext'
import { GRANTED_KEY } from '@/hooks/useGeolocation'
import { env } from '@/lib/env'
import { normalizeSavedNationality } from '@/lib/nationality'
import { clearOfflineCache, readJson } from '@/lib/storage'
import { LOCALES, useLanguage, useT, type Language } from '@/i18n'

// Each language is named in itself, so it can be found whatever the current language is.
const LANGUAGES: { code: Language; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'ceb', name: 'Cebuano' },
]

const APPEARANCE_OPTIONS: ThemeMode[] = ['system', 'light', 'dark']

type PermissionId = 'camera' | 'location'
type PermissionStatus = 'granted' | 'denied' | 'prompt'

// Titles, descriptions and status labels are in `t.profile.permissions`.
const PERMISSION_ITEMS: PermissionId[] = ['camera', 'location']

const STATUS_PILL: Record<PermissionStatus, string> = {
  granted: 'bg-sage-soft text-sage-deep',
  denied: 'bg-terracotta-soft text-terracotta-ink',
  prompt: 'bg-navy-soft text-navy',
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

async function requestCameraPermission(): Promise<PermissionStatus> {
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

export default function ProfilePage() {
  const auth = useAuth()
  const me = useMe()
  const updateMe = useUpdateMe()
  const prefs = usePreferences()
  const p = useT().profile
  const queryClient = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Real browser permission states (Location defaults to 'prompt' until rationale is accepted & browser grants it)
  const [permissionStates, setPermissionStates] = useState<Record<PermissionId, PermissionStatus>>({
    camera: 'prompt',
    location: 'prompt',
  })
  const [requestingCamera, setRequestingCamera] = useState(false)

  useEffect(() => {
    if (!navigator.permissions?.query) return
    let active = true
    Promise.all([queryBrowserPermission('camera'), queryBrowserPermission('location')]).then(
      ([camera, loc]) => {
        if (active) {
          setPermissionStates((prev) =>
            prev.camera === camera && prev.location === loc ? prev : { camera, location: loc },
          )
        }
      },
    )
    return () => {
      active = false
    }
  }, [location.pathname, searchParams])

  // Modals
  const [isLanguageOpen, setIsLanguageOpen] = useState(false)
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [cacheCleared, setCacheCleared] = useState(false)

  const isPermissionsView =
    location.pathname.endsWith('/permissions') || searchParams.get('view') === 'permissions'

  const openPermissionsView = () => {
    setSearchParams({ view: 'permissions' })
  }

  const closePermissionsView = () => {
    if (location.pathname.endsWith('/permissions')) {
      navigate('/profile')
    } else {
      setSearchParams({})
    }
  }

  const handleSelectLanguage = (language: Language) => {
    prefs.update({ language })
    if (auth.status === 'signed-in') {
      updateMe.mutate({ language })
    }
    setIsLanguageOpen(false)
  }

  const handleSelectAppearance = (theme: ThemeMode) => {
    prefs.update({ theme })
    setIsAppearanceOpen(false)
  }

  const handleRequestCamera = async () => {
    setRequestingCamera(true)
    const next = await requestCameraPermission()
    setPermissionStates((prev) => ({ ...prev, camera: next }))
    setRequestingCamera(false)
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
  const currentAppearanceLabel = p.themes[prefs.theme]

  if (isPermissionsView) {
    return (
      <div className="bleed-under-nav relative min-h-dvh bg-ivory text-ink transition-colors duration-200">
        <PermissionsSubpage
          permissionStates={permissionStates}
          requestingCamera={requestingCamera}
          onRequestCamera={handleRequestCamera}
          onBack={closePermissionsView}
        />
      </div>
    )
  }

  return (
    <div className="bleed-under-nav relative min-h-dvh bg-ivory text-ink transition-colors duration-200">
      <main className="relative z-10 mx-auto max-w-md px-5 pt-[max(3.25rem,env(safe-area-inset-top))] focus:outline-none">
        {/* Header Section */}
        <header className="mb-4">
          <div className="mb-1 text-xs leading-4 font-bold tracking-[0.1em] text-terracotta-ink uppercase">
            {p.eyebrow}
          </div>
          <h1 className="text-3xl leading-9 font-extrabold tracking-tight text-ink">
            {p.title}
          </h1>
        </header>

        {/* ========================================================
            SECTIONS 1–3: AUTHENTICATED TRAVELER PROFILE
           ======================================================== */}
        <div className="mb-5">
          {auth.status !== 'signed-in' ? (
            <SignInPrompt message={p.signInPrompt} />
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
        <section aria-labelledby="preferences-title" className="mb-5">
          <div className="mb-2.5">
            <h2 id="preferences-title" className="text-xs leading-4 font-bold tracking-[0.1em] text-terracotta-ink uppercase">
              {p.preferences}
            </h2>
            <p className="mt-0.5 text-xs leading-4 font-medium text-ink-muted">
              {p.preferencesBody}
            </p>
          </div>

          <div className="space-y-1.5 rounded-3xl border border-ivory-line bg-ivory-surface px-3 py-2.5">
            {/* Appearance Row (System default / Light / Dark) */}
            <button
              type="button"
              onClick={() => setIsAppearanceOpen(true)}
              className="touch-target flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-1.5 py-2 text-left transition-colors hover:bg-ivory/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
              aria-label={p.appearanceLabel(currentAppearanceLabel)}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-terracotta-soft text-terracotta-ink">
                  <MoonIcon size={16} />
                </span>
                <div className="min-w-0">
                  <span className="block text-[0.9375rem] leading-[1.375rem] font-bold text-ink">{p.appearance}</span>
                  <span className="block truncate text-xs leading-4 text-ink-muted">{p.appearanceBody}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-xs leading-4 font-bold text-ink-muted">
                <span>{currentAppearanceLabel}</span>
                <ChevronForwardOutlineIcon size={16} className="text-ink-muted" />
              </div>
            </button>

            {/* Language Row */}
            <button
              type="button"
              onClick={() => setIsLanguageOpen(true)}
              className="touch-target flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-1.5 py-2 text-left transition-colors hover:bg-ivory/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
              aria-label={p.languageLabel(currentLangLabel)}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-terracotta-soft text-terracotta-ink">
                  <GlobeOutlineIcon size={16} />
                </span>
                <div className="min-w-0">
                  <span className="block text-[0.9375rem] leading-[1.375rem] font-bold text-ink">{p.language}</span>
                  <span className="block truncate text-xs leading-4 text-ink-muted">{p.languageBody}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-xs leading-4 font-bold text-ink-muted">
                <span>{currentLangLabel}</span>
                <ChevronForwardOutlineIcon size={16} className="text-ink-muted" />
              </div>
            </button>

            {/* Permissions Row */}
            <button
              type="button"
              onClick={openPermissionsView}
              className="touch-target flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-1.5 py-2 text-left transition-colors hover:bg-ivory/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
              aria-label={p.permissionsLabel(allowedPermissionsCount)}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-terracotta-soft text-terracotta-ink">
                  <ShieldCheckmarkIcon size={16} />
                </span>
                <div className="min-w-0">
                  <span className="block text-[0.9375rem] leading-[1.375rem] font-bold text-ink">{p.permissionsRow}</span>
                  <span className="block truncate text-xs leading-4 text-ink-muted">{p.permissionsBody}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-xs leading-4 font-bold text-ink-muted">
                <span>{p.allowedCount(allowedPermissionsCount)}</span>
                <ChevronForwardOutlineIcon size={16} className="text-ink-muted" />
              </div>
            </button>

            {/* Proximity Alerts Toggle Row */}
            <div className="flex min-h-12 items-center justify-between gap-3 rounded-2xl px-1.5 py-1">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-terracotta-soft text-terracotta-ink">
                  <LocationIcon size={16} />
                </span>
                <div className="min-w-0">
                  <span className="block text-[0.9375rem] leading-[1.375rem] font-bold text-ink">{p.proximity}</span>
                  <span className="block truncate text-xs leading-4 text-ink-muted">{p.proximityBody}</span>
                </div>
              </div>
              <AccessibleToggle
                id="proximity-alerts-toggle"
                label={p.proximity}
                checked={prefs.proximityAlerts}
                onToggle={() => prefs.update({ proximityAlerts: !prefs.proximityAlerts })}
              />
            </div>

            {/* Daily Streak Reminders Toggle Row */}
            <div className="flex min-h-12 items-center justify-between gap-3 rounded-2xl px-1.5 py-1">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-terracotta-soft text-terracotta-ink">
                  <FlameIcon size={16} />
                </span>
                <div className="min-w-0">
                  <span className="block text-[0.9375rem] leading-[1.375rem] font-bold text-ink">{p.streak}</span>
                  <span className="block truncate text-xs leading-4 text-ink-muted">{p.streakBody}</span>
                </div>
              </div>
              <AccessibleToggle
                id="streak-reminders-toggle"
                label={p.streak}
                checked={prefs.streakReminders}
                onToggle={() => prefs.update({ streakReminders: !prefs.streakReminders })}
              />
            </div>

            {/* Quest Completion Notices Toggle Row */}
            <div className="flex min-h-12 items-center justify-between gap-3 rounded-2xl px-1.5 py-1">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-terracotta-soft text-terracotta-ink">
                  <NotificationsIcon size={16} />
                </span>
                <div className="min-w-0">
                  <span className="block text-[0.9375rem] leading-[1.375rem] font-bold text-ink">{p.quests}</span>
                  <span className="block truncate text-xs leading-4 text-ink-muted">{p.questsBody}</span>
                </div>
              </div>
              <AccessibleToggle
                id="quest-notices-toggle"
                label={p.quests}
                checked={prefs.questNotices}
                onToggle={() => prefs.update({ questNotices: !prefs.questNotices })}
              />
            </div>

            {/* Offline Storage Row */}
            <div className="flex min-h-12 items-center justify-between gap-3 rounded-2xl px-1.5 py-1">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-sage-soft text-sage-deep">
                  <CloudOfflineOutlineIcon size={16} />
                </span>
                <div className="min-w-0">
                  <span className="block text-[0.9375rem] leading-[1.375rem] font-bold text-ink">{p.offline}</span>
                  <span className="block truncate text-xs leading-4 text-ink-muted">{p.offlineBody}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearCache}
                className="touch-target flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl px-2.5 text-xs leading-4 font-bold text-terracotta-ink transition-colors hover:bg-terracotta-soft/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
              >
                {cacheCleared ? p.cleared : p.clearCache}
              </button>
            </div>
          </div>

          {updateMe.isError && (
            <div className="mt-3">
              <ErrorMessage error={updateMe.error} />
            </div>
          )}
        </section>

        {/* ========================================================
            SECTION 5: SUPPORT & ABOUT
           ======================================================== */}
        <section aria-labelledby="support-title" className="mb-5">
          <div className="mb-2.5">
            <h2 id="support-title" className="text-xs leading-4 font-bold tracking-[0.1em] text-terracotta-ink uppercase">
              {p.support}
            </h2>
          </div>

          <div className="space-y-1.5 rounded-3xl border border-ivory-line bg-ivory-surface px-3 py-2.5">
            {/* Help Center */}
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="touch-target flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-1.5 py-2 text-left transition-colors hover:bg-ivory/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-sage-soft text-sage-deep">
                  <HelpCircleOutlineIcon size={16} />
                </span>
                <div className="min-w-0">
                  <span className="block text-[0.9375rem] leading-[1.375rem] font-bold text-ink">{p.help}</span>
                  <span className="block truncate text-xs leading-4 text-ink-muted">{p.helpBody}</span>
                </div>
              </div>
              <ChevronForwardOutlineIcon size={16} className="text-ink-muted" />
            </button>

            {/* About App */}
            <button
              type="button"
              onClick={() => setIsAboutOpen(true)}
              className="touch-target flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-1.5 py-2 text-left transition-colors hover:bg-ivory/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-sage-soft text-sage-deep">
                  <InformationCircleOutlineIcon size={16} />
                </span>
                <div className="min-w-0">
                  <span className="block text-[0.9375rem] leading-[1.375rem] font-bold text-ink">{p.about}</span>
                  <span className="block truncate text-xs leading-4 text-ink-muted">{p.aboutBody}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-xs leading-4 font-bold text-ink-muted">
                <span>v{env.appVersion || '1.0.0'}</span>
                <ChevronForwardOutlineIcon size={16} className="text-ink-muted" />
              </div>
            </button>
          </div>
        </section>

        {/* ========================================================
            SECTION 6: ABOUT THE DEVELOPER (CLEARLY SEPARATED)
           ======================================================== */}
        <section aria-labelledby="developer-title" className="mb-4">
          <div className="flex items-stretch gap-3 rounded-[20px] border border-ivory-line bg-ivory-surface py-3.5 pr-4 pl-3.5">
            <div className="w-[5px] shrink-0 rounded-full bg-terracotta" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 id="developer-title" className="text-xs leading-4 font-bold tracking-[0.1em] text-terracotta-ink uppercase">
                {p.developer}
              </h2>
              <p className="mt-1 text-xs leading-4 font-medium text-ink-body">
                {p.developerBody}
              </p>
              <p className="mt-1 text-xs leading-4 text-ink-muted">
                {p.developerCredit}
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================
            SECTION 7: LOG OUT (SIGNED-IN TRAVELERS)
           ======================================================== */}
        {auth.status === 'signed-in' && (
          <section aria-label={p.accountActions} className="mb-6">
            <button
              type="button"
              onClick={() => setIsLogoutConfirmOpen(true)}
              className="touch-target flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-ivory-line bg-ivory-surface px-4 py-3.5 text-[0.9375rem] leading-[1.375rem] font-bold text-ink transition-colors hover:bg-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              <LogOutOutlineIcon size={18} />
              <span>{p.logOut}</span>
            </button>
          </section>
        )}
      </main>

      {/* ========================================================
          MODAL: CHOOSE APPEARANCE
         ======================================================== */}
      {isAppearanceOpen && (
        <ChooseAppearanceModal
          currentTheme={prefs.theme}
          onSelectTheme={handleSelectAppearance}
          onClose={() => setIsAppearanceOpen(false)}
        />
      )}

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
          title={p.logOutTitle}
          message={p.logOutBody}
          confirmLabel={p.logOut}
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
  const p = useT().profile
  const locales = LOCALES[useLanguage()]
  const [isEditOpen, setIsEditOpen] = useState(false)
  const getEditFormData = () => {
    const savedNationality = me.profile.nationality ?? ''
    const nationality = normalizeSavedNationality(savedNationality)
    return { displayName: me.profile.displayName, savedNationality, nationality, bio: me.profile.bio ?? '' }
  }
  const [editFormData, setEditFormData] = useState(getEditFormData)
  const [validationError, setValidationError] = useState<string | null>(null)

  const displayName = me.profile.displayName.trim() || p.unnamed
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
    if (!isEditOpen) setEditFormData(getEditFormData())
    setIsEditOpen(!isEditOpen)
  }

  const handleCancelEdit = () => {
    setValidationError(null)
    setIsEditOpen(false)
  }

  const handleSaveProfile = (e: FormEvent) => {
    e.preventDefault()
    const trimmedName = editFormData.displayName.trim()
    if (!trimmedName) {
      setValidationError(p.nameRequired)
      return
    }
    const { nationality, savedNationality } = editFormData
    const nationalityChanged = nationality !== savedNationality
    setValidationError(null)
    updateMe.mutate(
      {
        displayName: trimmedName,
        ...(nationalityChanged && { nationality: nationality || null }),
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
        aria-label={p.info}
        className="mb-4 rounded-3xl border border-ivory-line bg-ivory-surface p-[18px]"
      >
        <div className="flex items-center justify-between gap-3.5">
          {/* Avatar */}
          <div className="relative shrink-0">
            {me.profile.avatarUrl ? (
              <img
                src={me.profile.avatarUrl}
                alt={p.pictureOf(displayName)}
                className="size-16 rounded-full border-2 border-terracotta object-cover"
              />
            ) : (
              <div
                role="img"
                aria-label={p.avatarFor(displayName, initials)}
                className="flex size-16 items-center justify-center rounded-full bg-terracotta text-[1.375rem] leading-7 font-bold tracking-[0.01em] text-on-navy select-none"
              >
                {initials}
              </div>
            )}
          </div>

          {/* Profile Name & Rank Details */}
          <div className="min-w-0 flex-1">
            <span className="block truncate text-xs leading-4 font-bold tracking-[0.1em] text-terracotta-ink uppercase">
              {p.rankLevel(me.rank.title, me.rank.level)}
            </span>
            <h2 className="mt-0.5 truncate text-lg leading-6 font-bold break-words text-ink">
              {displayName}
            </h2>
            {me.email && (
              <p className="mt-0.5 truncate text-xs leading-4 font-medium break-words text-ink-muted">
                {me.email}
              </p>
            )}
            {me.profile.nationality && (
              <p className="mt-0.5 truncate text-xs leading-4 font-medium break-words text-ink-muted">
                {me.profile.nationality}
              </p>
            )}
            <p className="mt-1 line-clamp-2 text-xs leading-4 break-words text-ink-muted">
              {me.profile.bio ? me.profile.bio : <span className="italic">{p.noBio}</span>}
            </p>
          </div>

          {/* Edit / Editing Button */}
          <button
            type="button"
            onClick={handleToggleEdit}
            aria-expanded={isEditOpen}
            aria-controls="edit-profile-section"
            className={`touch-target flex min-h-12 min-w-12 shrink-0 items-center justify-center gap-1.5 rounded-[10px] border px-3 py-2 text-xs leading-4 font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
              isEditOpen
                ? 'border-terracotta bg-terracotta-soft text-terracotta-ink'
                : 'border-ivory-line bg-ivory text-ink hover:bg-ivory-deep'
            }`}
            aria-label={isEditOpen ? p.editingLabel : p.editLabel}
          >
            <CreateOutlineIcon size={15} />
            <span>{isEditOpen ? p.editing : p.edit}</span>
          </button>
        </div>

        {me.badges.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2 border-t border-ivory-line pt-3" aria-label={p.earnedBadges}>
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
          aria-label={p.editLabel}
          className="mb-4 overflow-hidden rounded-3xl border border-terracotta bg-ivory-surface p-5 transition-all"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs leading-4 font-bold tracking-[0.1em] text-terracotta-ink uppercase">
                {p.personalDetails}
              </div>
              <h3 className="mt-0.5 text-lg leading-6 font-bold text-ink">
                {p.editProfile}
              </h3>
            </div>
            <button
              type="button"
              onClick={handleCancelEdit}
              aria-label={p.closeEditor}
              className="touch-target flex size-12 min-h-12 min-w-12 items-center justify-center rounded-full bg-ivory text-ink-muted transition-colors hover:bg-ivory-line/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              <CloseOutlineIcon size={20} />
            </button>
          </div>

          <form onSubmit={handleSaveProfile} noValidate className="space-y-3.5">
            <div>
              <label
                htmlFor="edit-display-name"
                className="mb-1.5 block text-xs leading-4 font-bold tracking-[0.1em] text-terracotta-ink uppercase"
              >
                {p.displayName}
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
                  className="h-12 w-full rounded-[14px] border border-line-strong bg-ivory pr-3.5 pl-10 text-sm leading-5 font-normal text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-navy"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="edit-nationality"
                className="mb-1.5 block text-xs leading-4 font-bold tracking-[0.1em] text-terracotta-ink uppercase"
              >
                {p.nationality}
              </label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3.5 z-10 text-terracotta">
                  <GlobeOutlineIcon size={18} />
                </span>
                <NationalitySelect
                  id="edit-nationality"
                  value={editFormData.nationality}
                  savedValue={normalizeSavedNationality(editFormData.savedNationality)}
                  onValueChange={(nationality) => {
                    setValidationError(null)
                    setEditFormData((prev) => ({ ...prev, nationality }))
                  }}
                  className="h-12 w-full min-w-0 rounded-[14px] border border-line-strong bg-ivory pl-10 text-sm leading-5 font-normal text-ink scheme-light focus-visible:outline-2 focus-visible:outline-navy dark:scheme-dark"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="edit-travel-bio"
                className="mb-1.5 block text-xs leading-4 font-bold tracking-[0.1em] text-terracotta-ink uppercase"
              >
                {p.bio}
              </label>
              <textarea
                id="edit-travel-bio"
                name="bio"
                rows={3}
                maxLength={280}
                value={editFormData.bio}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, bio: e.target.value }))}
                placeholder={p.bioPlaceholder}
                className="w-full resize-none rounded-[14px] border border-line-strong bg-ivory px-3.5 py-3 text-sm leading-5 font-normal text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-navy"
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
                className="touch-target flex min-h-12 items-center justify-center rounded-xl border border-ivory-line bg-ivory-surface px-[18px] py-3 text-[0.9375rem] leading-[1.375rem] font-bold text-ink transition-colors hover:bg-ivory focus-visible:outline-2 focus-visible:outline-navy"
              >
                {p.cancel}
              </button>
              <button
                type="submit"
                disabled={updateMe.isPending}
                className="touch-target flex min-h-12 items-center gap-1.5 rounded-xl bg-navy px-[18px] py-3 text-[0.9375rem] leading-[1.375rem] font-bold text-on-navy transition-colors hover:bg-navy-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:opacity-60"
              >
                <CheckmarkIcon size={16} />
                <span>{updateMe.isPending ? p.saving : p.save}</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* SECTION 2: STATS SUMMARY (VISITED, BADGES, STREAK) */}
      <section aria-label={p.stats} className="mb-4 grid grid-cols-3 gap-2.5">
        <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-ivory-line bg-ivory-surface px-2 py-3 text-center">
          <LocationIcon size={18} className="shrink-0 text-terracotta" />
          <span className="text-lg leading-6 font-bold text-ink">{me.stats.visitedCount}</span>
          <span className="text-[0.6875rem] leading-[0.875rem] font-bold tracking-[0.02em] text-ink-muted">
            {p.placesVisited}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-ivory-line bg-ivory-surface px-2 py-3 text-center">
          <RibbonIcon size={18} className="shrink-0 text-sage-deep" />
          <span className="text-lg leading-6 font-bold text-ink">{me.badges.length}</span>
          <span className="text-[0.6875rem] leading-[0.875rem] font-bold tracking-[0.02em] text-ink-muted">
            {p.badgesEarned}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-ivory-line bg-ivory-surface px-2 py-3 text-center">
          <FlameIcon size={18} className="shrink-0 text-terracotta" />
          <span className="text-lg leading-6 font-bold text-ink">{me.stats.streakCount}</span>
          <span className="text-[0.6875rem] leading-[0.875rem] font-bold tracking-[0.02em] text-ink-muted">
            {p.dayStreak}
          </span>
        </div>
      </section>

      {/* SECTION 3: JOURNEY PROGRESS (LEVEL & XP) */}
      <section
        aria-label={p.levelProgress}
        className="rounded-3xl bg-navy p-[18px] text-on-navy"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs leading-4 font-bold tracking-[0.1em] text-on-navy/80 uppercase">
              {p.journey}
            </span>
            <h2 className="mt-0.5 text-lg leading-6 font-bold text-on-navy">
              {p.levelTitle(me.rank.level)}
            </h2>
          </div>
          <span className="font-mono text-xs leading-4 font-bold tabular-nums text-on-navy">
            {me.rank.xp.toLocaleString(locales)} XP
          </span>
        </div>

        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={p.progressTo(me.rank.level + 1)}
          className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-navy-soft"
        >
          <div
            className="h-full rounded-full bg-terracotta transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="mt-2.5 text-xs leading-4 font-medium text-on-navy/90">
          {me.rank.nextLevelXp !== null
            ? p.toReach(xpRemaining.toLocaleString(locales), me.rank.level + 1)
            : p.topRank}
        </p>
      </section>
    </>
  )
}

/* =========================================================================
   SUBCOMPONENTS, MODAL DIALOG & ACCESSIBLE TOGGLE
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
  const p = useT().profile

  return (
    <button
      id={toggleId}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={p.toggle(label, checked)}
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

/**
 * Accessible modal dialog that moves focus to the close button on open, traps Tab inside the
 * dialog, closes on Escape, and restores focus to the trigger element on unmount.
 */
function ModalDialog({
  titleId,
  eyebrow,
  title,
  closeLabel,
  describedBy,
  onClose,
  children,
}: {
  titleId: string
  eyebrow: string
  title: string
  closeLabel: string
  describedBy?: string
  onClose: () => void
  children: ReactNode
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    closeBtnRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus?.()
    }
  }, [])

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={describedBy}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 dark:bg-ivory-deep/60 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-sm rounded-3xl border border-ivory-line bg-ivory-surface px-5 py-[18px] text-ink shadow-modal">
        <div className="mb-3.5 flex items-center justify-between">
          <div>
            <div className="text-xs leading-4 font-bold tracking-[0.1em] text-terracotta-ink uppercase">
              {eyebrow}
            </div>
            <h2 id={titleId} className="mt-0.5 text-lg leading-6 font-bold text-ink">
              {title}
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="touch-target flex size-12 min-h-12 min-w-12 items-center justify-center rounded-full bg-ivory text-ink-muted transition-colors hover:bg-ivory-line/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            <CloseOutlineIcon size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Choose Appearance Modal (System default / Light / Dark) */
function ChooseAppearanceModal({
  currentTheme,
  onSelectTheme,
  onClose,
}: {
  currentTheme: ThemeMode
  onSelectTheme: (theme: ThemeMode) => void
  onClose: () => void
}) {
  const p = useT().profile
  return (
    <ModalDialog
      titleId="choose-appearance-title"
      eyebrow={p.theme}
      title={p.chooseAppearance}
      closeLabel={p.closeAppearance}
      onClose={onClose}
    >
      <div role="radiogroup" aria-label={p.appearanceOptions} className="space-y-2">
        {APPEARANCE_OPTIONS.map((mode) => {
          const isSelected = currentTheme === mode
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelectTheme(mode)}
              className={`touch-target flex min-h-12 w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs leading-4 font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
                isSelected
                  ? 'border-navy bg-navy-soft text-ink'
                  : 'border-ivory-line bg-ivory text-ink hover:bg-ivory-deep'
              }`}
            >
              <div className="flex items-center gap-3">
                <MoonOutlineIcon size={18} className="shrink-0 text-terracotta" />
                <span>{p.themes[mode]}</span>
              </div>
              {isSelected && <CheckmarkIcon size={18} className="shrink-0 font-bold text-navy" />}
            </button>
          )
        })}
      </div>
    </ModalDialog>
  )
}

/** Choose Language Modal */
function ChooseLanguageModal({
  currentLanguage,
  onSelectLanguage,
  onClose,
}: {
  currentLanguage: Language
  onSelectLanguage: (code: Language) => void
  onClose: () => void
}) {
  const p = useT().profile
  return (
    <ModalDialog
      titleId="choose-lang-title"
      eyebrow={p.appLanguage}
      title={p.chooseLanguage}
      closeLabel={p.closeLanguage}
      onClose={onClose}
    >
      <div role="radiogroup" aria-label={p.languages} className="space-y-2">
        {LANGUAGES.map((lang) => {
          const isSelected = currentLanguage === lang.code
          return (
            <button
              key={lang.code}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelectLanguage(lang.code)}
              lang={lang.code}
              className={`touch-target flex min-h-12 w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs leading-4 font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
                isSelected
                  ? 'border-navy bg-navy-soft text-ink'
                  : 'border-ivory-line bg-ivory text-ink hover:bg-ivory-deep'
              }`}
            >
              <div className="flex items-center gap-3">
                <GlobeOutlineIcon size={18} className="shrink-0 text-terracotta" />
                <span>{lang.name}</span>
              </div>
              {isSelected && <CheckmarkIcon size={18} className="shrink-0 font-bold text-navy" />}
            </button>
          )
        })}
      </div>
    </ModalDialog>
  )
}

/** Permissions Subpage using shared TopNavbar and real navigator.permissions.query() state */
function PermissionsSubpage({
  permissionStates,
  requestingCamera,
  onRequestCamera,
  onBack,
}: {
  permissionStates: Record<PermissionId, PermissionStatus>
  requestingCamera: boolean
  onRequestCamera: () => void
  onBack: () => void
}) {
  const p = useT().profile
  return (
    <div>
      <TopNavbar title={p.permissionsRow} titleAs="h1" backLabel={p.backToProfile} onBack={onBack} />
      <main className="relative z-10 mx-auto max-w-md px-5 pt-5 pb-8 focus:outline-none">
        <div className="space-y-4">
          {/* You're in control banner */}
          <section
            aria-label={p.privacyControl}
            className="flex items-center gap-3 rounded-3xl border border-sage bg-sage-soft p-4"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sage-deep text-on-navy">
              <ShieldCheckmarkIcon size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg leading-6 font-bold text-ink">{p.inControl}</h2>
              <p className="mt-0.5 text-xs leading-4 font-medium text-ink-muted">
                {p.inControlBody}
              </p>
            </div>
          </section>

          {/* Permission item cards */}
          <section aria-label={p.items} className="space-y-3">
            {PERMISSION_ITEMS.map((id) => {
              const status = permissionStates[id]
              return (
                <article
                  key={id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-ivory-line bg-ivory-surface px-4 py-3.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-terracotta-soft text-terracotta-ink">
                      {id === 'location' && <LocationOutlineIcon size={18} />}
                      {id === 'camera' && <CameraOutlineIcon size={18} />}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[0.9375rem] leading-[1.375rem] font-bold text-ink">{p.permissions[id]}</h3>
                      <p className="mt-0.5 truncate text-xs leading-4 font-medium text-ink-muted">{p.permissions[`${id}Body`]}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-3 py-1.5 text-xs leading-4 font-bold ${STATUS_PILL[status]}`}>
                      {p.permissions[status]}
                    </span>
                    {status === 'prompt' && id === 'camera' && (
                      <button
                        type="button"
                        disabled={requestingCamera}
                        onClick={onRequestCamera}
                        aria-label={p.allowCamera}
                        className="touch-target flex min-h-12 min-w-12 items-center justify-center rounded-xl bg-navy px-3 text-xs font-bold text-on-navy transition-colors hover:bg-navy-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:opacity-60"
                      >
                        {requestingCamera ? p.asking : p.allow}
                      </button>
                    )}
                    {status === 'prompt' && id === 'location' && (
                      <Link
                        to="/permissions"
                        state={{ next: '/profile' }}
                        aria-label={p.allowLocation}
                        className="touch-target flex min-h-12 min-w-12 items-center justify-center rounded-xl bg-navy px-3 text-xs font-bold text-on-navy transition-colors hover:bg-navy-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                      >
                        {p.allow}
                      </Link>
                    )}
                  </div>
                </article>
              )
            })}
          </section>

          {/* Privacy Note */}
          <aside
            aria-label={p.privacyNote}
            className="flex items-start gap-3 rounded-2xl border border-terracotta/20 bg-terracotta-soft p-4 text-xs text-ink"
          >
            <LockClosedOutlineIcon size={18} className="mt-0.5 shrink-0 text-terracotta-ink" />
            <p className="leading-relaxed text-ink-body">
              {p.privacyBody}
            </p>
          </aside>

          {/* Actions */}
          <div className="space-y-2.5 pt-2 pb-2">
            <Link
              to="/permissions"
              state={{ next: '/profile' }}
              className="touch-target flex min-h-12 w-full items-center justify-center rounded-2xl border border-ivory-line bg-ivory-surface px-4 text-sm font-bold text-ink transition-colors hover:bg-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              {p.openSetup}
            </Link>
            <button
              type="button"
              onClick={onBack}
              className="touch-target flex min-h-12 w-full items-center justify-center rounded-2xl bg-navy text-base font-bold text-on-navy shadow-sm transition-colors hover:bg-navy-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              {p.done}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

/** Help Center Modal */
function HelpCenterModal({ onClose }: { onClose: () => void }) {
  const p = useT().profile
  const faqs = p.faqs

  return (
    <ModalDialog
      titleId="help-center-title"
      eyebrow={p.supportEyebrow}
      title={p.help}
      closeLabel={p.closeHelp}
      onClose={onClose}
    >
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
        <span>{p.contact}</span>
      </a>
    </ModalDialog>
  )
}

/** About App Modal */
function AboutAppModal({ onClose }: { onClose: () => void }) {
  const p = useT().profile
  return (
    <ModalDialog
      titleId="about-dialog-title"
      eyebrow={p.aboutEyebrow}
      title={p.aboutTitle}
      closeLabel={p.closeAbout}
      onClose={onClose}
    >
      <div className="mb-3 flex items-center gap-1.5 rounded-2xl border border-sage/30 bg-sage-soft p-3">
        <span className="text-xs font-black tracking-widest text-ink">LAAG TA</span>
        <span className="text-sm font-black text-terracotta-ink">bAI</span>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-ink-muted">
        {p.aboutIntro}
      </p>

      <div className="mb-5 space-y-2.5">
        <div className="rounded-2xl border border-sage/30 bg-sage-soft p-3">
          <h3 className="text-xs font-bold text-ink">{p.version}</h3>
          <p className="mt-0.5 text-xs text-ink-muted">v{env.appVersion || '1.0.0'}</p>
        </div>

        <div className="rounded-2xl border border-sage/30 bg-sage-soft p-3">
          <h3 className="text-xs font-bold text-ink">{p.privacy}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
            {p.aboutPrivacy}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="touch-target flex min-h-12 w-full items-center justify-center rounded-2xl bg-navy text-sm font-bold text-on-navy shadow-sm transition-colors hover:bg-navy-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
      >
        {p.close}
      </button>
    </ModalDialog>
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
  const p = useT().profile
  return (
    <ModalDialog
      titleId="confirm-modal-title"
      eyebrow={p.account}
      title={title}
      closeLabel={p.closeDialog}
      describedBy="confirm-modal-desc"
      onClose={onCancel}
    >
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
          {p.cancel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="touch-target flex min-h-12 items-center justify-center rounded-xl bg-navy text-sm font-bold text-on-navy shadow-sm transition-colors hover:bg-navy-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          {confirmLabel}
        </button>
      </div>
    </ModalDialog>
  )
}
