import { useState, useId, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowBackOutlineIcon,
  CameraOutlineIcon,
  CheckmarkOutlineIcon,
  ChevronForwardOutlineIcon,
  CloseOutlineIcon,
  CreateOutlineIcon,
  FlameOutlineIcon,
  GlobeOutlineIcon,
  HelpCircleOutlineIcon,
  ImagesOutlineIcon,
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
import { usePreferences, type ThemeMode } from '@/features/preferences/PreferencesContext'
import { resetBookmarksCache } from '@/features/bookmarks/useBookmarks'
import { clearOfflineCache, readJson, writeJson } from '@/lib/storage'
import { env } from '@/lib/env'

type LanguageOption = {
  code: 'en' | 'ceb' | 'fil'
  name: string
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English' },
  { code: 'ceb', name: 'Cebuano' },
  { code: 'fil', name: 'Filipino' },
]

type PermissionItem = {
  id: string
  title: string
  description: string
  enabled: boolean
}

const DEFAULT_PERMISSIONS: PermissionItem[] = [
  { id: 'location', title: 'Location', description: 'Show landmarks and stories near you', enabled: true },
  { id: 'camera', title: 'Camera', description: 'Scan and identify Cebu landmarks', enabled: true },
  { id: 'photos', title: 'Photos', description: 'Choose existing images for landmark scans', enabled: false },
  { id: 'notifications', title: 'Notifications', description: 'Nearby places, quests, and travel tips', enabled: true },
]

export default function ProfilePage() {
  const auth = useAuth()
  const prefs = usePreferences()
  const queryClient = useQueryClient()

  // Profile data (persisted to storage for demo & editable travel profile, starts from beginning)
  const [profile, setProfile] = useState(() => {
    const saved = readJson('user_profile_data_v1', null)
    if (saved) return saved
    return {
      displayName: auth.user?.displayName || 'Andrea M.',
      email: auth.user?.email || 'andrea@example.com',
      bio: '',
      avatarUrl: '',
      title: 'CEBUANO EXPLORER',
      level: 1,
      xp: 0,
      nextLevelXp: 100,
      nextTitle: 'Cultural Navigator',
      placesVisited: 0,
      badgesEarned: 0,
      dayStreak: 0,
    }
  })

  // Notification toggle state
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => prefs.questNotices)

  // Permissions state
  const [permissions, setPermissions] = useState<PermissionItem[]>(() =>
    readJson('app_permissions', DEFAULT_PERMISSIONS),
  )

  // Modals & sub-views
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editFormData, setEditFormData] = useState({
    displayName: profile.displayName,
    email: profile.email,
    bio: profile.bio,
  })
  const [isLanguageOpen, setIsLanguageOpen] = useState(false)
  const [currentView, setCurrentView] = useState<'profile' | 'permissions'>('profile')
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [accountDeletedMessage, setAccountDeletedMessage] = useState<string | null>(null)

  const isDarkMode = prefs.resolvedTheme === 'dark'

  const toggleTheme = () => {
    const nextTheme: ThemeMode = isDarkMode ? 'light' : 'dark'
    prefs.update({ theme: nextTheme })
  }

  const toggleNotifications = () => {
    const next = !notificationsEnabled
    setNotificationsEnabled(next)
    prefs.update({ questNotices: next, streakReminders: next, proximityAlerts: next })
  }

  const handleSelectLanguage = (langCode: 'en' | 'ceb' | 'fil') => {
    // Map to supported app language ('en' or 'ceb')
    const mapped = langCode === 'fil' ? 'en' : langCode
    prefs.update({ language: mapped })
    setIsLanguageOpen(false)
  }

  const togglePermission = (id: string) => {
    setPermissions((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
      writeJson('app_permissions', next)
      return next
    })
  }

  const allowedPermissionsCount = permissions.filter((p) => p.enabled).length

  const handleToggleEdit = () => {
    setIsEditOpen((prev) => {
      const next = !prev
      if (next) {
        setEditFormData({
          displayName: profile.displayName,
          email: profile.email,
          bio: profile.bio,
        })
      }
      return next
    })
  }

  const handleCancelEdit = () => {
    setEditFormData({
      displayName: profile.displayName,
      email: profile.email,
      bio: profile.bio,
    })
    setIsEditOpen(false)
  }

  const handleSaveProfile = (e: FormEvent) => {
    e.preventDefault()
    const next = {
      ...profile,
      displayName: editFormData.displayName.trim() || 'Andrea M.',
      email: editFormData.email.trim() || 'andrea@example.com',
      bio: editFormData.bio.trim(),
    }
    setProfile(next)
    writeJson('user_profile_data_v1', next)
    setIsEditOpen(false)
  }

  const handleConfirmLogout = () => {
    setIsLogoutConfirmOpen(false)
    auth.signOut()
  }

  const handleConfirmDeleteAccount = () => {
    clearOfflineCache()
    resetBookmarksCache()
    queryClient.clear()
    writeJson('user_profile_data', null)
    setIsDeleteConfirmOpen(false)
    setAccountDeletedMessage('Your account and offline data have been deleted.')
    setTimeout(() => {
      auth.signOut()
    }, 1500)
  }

  const currentLangLabel =
    LANGUAGES.find((l) => l.code === (prefs.language as string))?.name ||
    (prefs.language === 'ceb' ? 'Cebuano' : 'English')

  // Calculate initials for placeholder avatar
  const initials =
    profile.displayName
      .trim()
      .split(/\s+/)
      .map((part: string) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'AM'

  const xpRemaining = Math.max(0, profile.nextLevelXp - profile.xp)
  const progressPercent = Math.min(100, Math.round((profile.xp / profile.nextLevelXp) * 100))

  if (currentView === 'permissions') {
    return (
      <div
        className="relative min-h-dvh min-h-screen -mb-nav bg-ivory text-ink transition-colors duration-200"
        style={{
          marginBottom: 'calc(-96px - env(safe-area-inset-bottom))',
          paddingBottom: 'calc(136px + env(safe-area-inset-bottom))',
        }}
      >
        <PermissionsPage
          permissions={permissions}
          onToggle={togglePermission}
          onBack={() => setCurrentView('profile')}
        />
      </div>
    )
  }

  return (
    <div
      className="relative min-h-dvh min-h-screen -mb-nav bg-ivory text-ink transition-colors duration-200"
      style={{
        marginBottom: 'calc(-96px - env(safe-area-inset-bottom))',
        paddingBottom: 'calc(136px + env(safe-area-inset-bottom))',
      }}
    >
      {/* Background Decorative Ambient Layer */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20 dark:opacity-10"
        style={{
          backgroundImage:
            'radial-gradient(circle at 10% 20%, rgba(155, 175, 154, 0.25) 0%, transparent 40%), radial-gradient(circle at 90% 60%, rgba(198, 107, 78, 0.15) 0%, transparent 45%)',
        }}
        aria-hidden="true"
      />

      <main className="relative z-10 mx-auto max-w-lg px-4 pt-6 focus:outline-none">
        {/* Header Section */}
        <header className="mb-6">
          <div className="text-xs font-bold uppercase tracking-[1.44px] text-terracotta mb-1">
            YOUR ACCOUNT
          </div>
          <h1 className="text-3xl font-black tracking-tight text-ink">
            Profile
          </h1>
        </header>

        {accountDeletedMessage && (
          <aside role="status" aria-live="polite" className="mb-6 rounded-2xl bg-danger-soft border border-danger-line p-4 text-sm font-semibold text-danger">
            {accountDeletedMessage}
          </aside>
        )}

        {/* ========================================================
            SECTION 1: PROFILE CARD (PICTURE, NAME, BIO, EDIT)
           ======================================================== */}
        <section
          aria-label="Profile information"
          className="rounded-3xl border border-ivory-line bg-ivory-surface p-5 shadow-xs mb-4"
        >
          <div className="flex items-start justify-between gap-3">
            {/* Avatar with Camera badge */}
            <div className="relative shrink-0">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={`Profile picture of ${profile.displayName}`}
                  className="h-20 w-20 rounded-full object-cover border-2 border-terracotta"
                />
              ) : (
                <div
                  role="img"
                  aria-label={`Avatar for ${profile.displayName}: initials ${initials}`}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-terracotta text-on-navy text-2xl font-black shadow-xs select-none"
                >
                  {initials}
                </div>
              )}
              <button
                type="button"
                onClick={handleToggleEdit}
                aria-label="Change profile photo"
                className="absolute -bottom-1 -right-1 flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-full bg-navy text-on-navy shadow-md border-2 border-ivory hover:scale-105 transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
              >
                <CameraOutlineIcon size={16} />
              </button>
            </div>

            {/* Profile Name & Rank Details */}
            <div className="min-w-0 flex-1 pl-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-terracotta truncate block">
                {profile.title} · LEVEL {profile.level}
              </span>
              <h2 className="text-xl font-black text-ink truncate mt-0.5 break-words">
                {profile.displayName}
              </h2>
              <p className="text-xs text-ink-muted truncate break-words mt-0.5">
                {profile.email}
              </p>
              <p className="text-xs text-ink-faint mt-1 line-clamp-2 break-words">
                {profile.bio ? profile.bio : <span className="italic">No travel bio yet.</span>}
              </p>
            </div>

            {/* Edit / Editing Button */}
            <button
              type="button"
              onClick={handleToggleEdit}
              aria-expanded={isEditOpen}
              aria-controls="edit-profile-section"
              className={`flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy shrink-0 ${
                isEditOpen
                  ? 'border-terracotta bg-terracotta/15 text-terracotta shadow-2xs'
                  : 'border-ivory-line bg-ivory/60 hover:bg-ivory text-ink'
              }`}
              aria-label={isEditOpen ? 'Editing profile details' : 'Edit profile details'}
            >
              <CreateOutlineIcon size={16} />
              <span>{isEditOpen ? 'Editing' : 'Edit'}</span>
            </button>
          </div>
        </section>

        {/* ========================================================
            INLINE EDIT PROFILE DROPDOWN COMPONENT (COLLAPSIBLE)
           ======================================================== */}
        {isEditOpen && (
          <section
            id="edit-profile-section"
            aria-label="Edit profile details"
            className="mb-4 overflow-hidden rounded-3xl border border-terracotta/30 bg-ivory-surface p-5 shadow-xs transition-all animate-fade-in"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-terracotta">
                  PERSONAL DETAILS
                </div>
                <h3 className="text-lg font-black text-ink mt-0.5">
                  Edit profile
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                aria-label="Close profile editor"
                className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-ivory-surface text-ink-muted hover:text-ink hover:bg-ivory-line/40 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
              >
                <CloseOutlineIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label
                  htmlFor="edit-display-name"
                  className="block text-xs font-bold uppercase tracking-wider text-terracotta mb-1.5"
                >
                  Display name
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-terracotta pointer-events-none">
                    <PersonOutlineIcon size={18} />
                  </span>
                  <input
                    id="edit-display-name"
                    name="displayName"
                    type="text"
                    required
                    value={editFormData.displayName}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, displayName: e.target.value }))}
                    className="h-12 w-full rounded-2xl border border-ivory-line bg-line/25 dark:bg-navy/30 pl-10 pr-4 text-sm font-semibold text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-navy"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="edit-email-address"
                  className="block text-xs font-bold uppercase tracking-wider text-terracotta mb-1.5"
                >
                  Email address
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-terracotta pointer-events-none">
                    <MailOutlineIcon size={18} />
                  </span>
                  <input
                    id="edit-email-address"
                    name="email"
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, email: e.target.value }))}
                    className="h-12 w-full rounded-2xl border border-ivory-line bg-line/25 dark:bg-navy/30 pl-10 pr-4 text-sm font-semibold text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-navy"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="edit-travel-bio"
                  className="block text-xs font-bold uppercase tracking-wider text-terracotta mb-1.5"
                >
                  Travel bio
                </label>
                <textarea
                  id="edit-travel-bio"
                  name="bio"
                  rows={2}
                  maxLength={200}
                  value={editFormData.bio}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell others about your travels in Cebu..."
                  className="w-full rounded-2xl border border-ivory-line bg-line/25 dark:bg-navy/30 p-3 text-sm font-semibold text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-navy resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex min-h-[42px] items-center justify-center rounded-xl border border-ivory-line px-5 py-2 text-sm font-bold text-ink hover:bg-ivory transition-colors focus-visible:outline-2 focus-visible:outline-navy"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex min-h-[42px] items-center gap-1.5 rounded-xl bg-navy px-5 py-2 text-sm font-bold text-on-navy shadow-sm hover:bg-navy-pressed transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                >
                  <CheckmarkOutlineIcon size={16} />
                  <span>Save changes</span>
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ========================================================
            SECTION 2: STATS SUMMARY (VISITED, BADGES, STREAK)
           ======================================================== */}
        <section aria-label="Exploration statistics" className="grid grid-cols-3 gap-2.5 mb-4">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-ivory-line bg-ivory-surface p-3 text-center shadow-2xs">
            <span className="text-xl font-black text-ink">{profile.placesVisited}</span>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-ink-muted">
              <LocationOutlineIcon size={13} className="text-terracotta shrink-0" />
              <span className="truncate">Places visited</span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border border-ivory-line bg-ivory-surface p-3 text-center shadow-2xs">
            <span className="text-xl font-black text-ink">{profile.badgesEarned}</span>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-ink-muted">
              <RibbonOutlineIcon size={13} className="text-sage-deep dark:text-sage shrink-0" />
              <span className="truncate">Badges earned</span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border border-ivory-line bg-ivory-surface p-3 text-center shadow-2xs">
            <span className="text-xl font-black text-ink">{profile.dayStreak}</span>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-ink-muted">
              <FlameOutlineIcon size={13} className="text-terracotta shrink-0" />
              <span className="truncate">Day streak</span>
            </div>
          </div>
        </section>

        {/* ========================================================
            SECTION 3: JOURNEY PROGRESS (LEVEL & XP)
           ======================================================== */}
        <section
          aria-label="Level progress"
          className="rounded-3xl border border-navy/15 bg-navy p-5 text-on-navy shadow-sm mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-ivory/70">
                YOUR JOURNEY
              </span>
              <h2 className="text-lg font-black tracking-tight text-on-navy mt-0.5">
                Level {profile.level} progress
              </h2>
            </div>
            <span className="text-sm font-extrabold text-on-navy">
              {profile.xp.toLocaleString()} XP
            </span>
          </div>

          {/* Progress Bar with accessible progressbar role */}
          <div
            role="progressbar"
            aria-valuenow={profile.xp}
            aria-valuemin={0}
            aria-valuemax={profile.nextLevelXp}
            aria-label={`Progress to level ${profile.level + 1}`}
            className="mt-3.5 h-3 w-full overflow-hidden rounded-full bg-navy-soft"
          >
            <div
              className="h-full rounded-full bg-terracotta transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className="mt-2 text-xs font-medium text-ivory/80">
            {xpRemaining} XP to reach {profile.nextTitle}
          </p>
        </section>

        {/* ========================================================
            SECTION 4: PREFERENCES & SETTINGS CARD
           ======================================================== */}
        <section aria-labelledby="preferences-title" className="mb-6">
          <div className="mb-2">
            <h2 id="preferences-title" className="text-xs font-bold uppercase tracking-wider text-terracotta">
              PREFERENCES
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Personalize your Laag ta bAI experience.
            </p>
          </div>

          <div className="space-y-2 rounded-3xl border border-ivory-line bg-ivory-surface p-2 shadow-xs">
            {/* Language Row */}
            <button
              type="button"
              onClick={() => setIsLanguageOpen(true)}
              className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl p-3 text-left hover:bg-ivory/60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
              aria-label={`Language, current selection: ${currentLangLabel}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-terracotta/15 text-terracotta">
                  <GlobeOutlineIcon size={18} />
                </span>
                <div className="min-w-0">
                  <span className="block text-sm font-bold text-ink">Language</span>
                  <span className="block text-xs text-ink-muted truncate">App language and translations</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 text-ink-body font-semibold text-xs">
                <span>{currentLangLabel}</span>
                <ChevronForwardOutlineIcon size={16} className="text-ink-muted" />
              </div>
            </button>

            {/* Permissions Row */}
            <button
              type="button"
              onClick={() => setCurrentView('permissions')}
              className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl p-3 text-left hover:bg-ivory/60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
              aria-label={`Permissions, ${allowedPermissionsCount} allowed`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-terracotta/15 text-terracotta">
                  <ShieldCheckmarkOutlineIcon size={18} />
                </span>
                <div className="min-w-0">
                  <span className="block text-sm font-bold text-ink">Permissions</span>
                  <span className="block text-xs text-ink-muted truncate">Camera, location, photos, and alerts</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 text-ink-body font-semibold text-xs">
                <span>{allowedPermissionsCount} allowed</span>
                <ChevronForwardOutlineIcon size={16} className="text-ink-muted" />
              </div>
            </button>

            {/* Notifications Toggle Row */}
            <div className="flex min-h-[52px] items-center justify-between gap-3 rounded-2xl p-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-terracotta/15 text-terracotta">
                  <NotificationsOutlineIcon size={18} />
                </span>
                <div className="min-w-0">
                  <span className="block text-sm font-bold text-ink">Notifications</span>
                  <span className="block text-xs text-ink-muted truncate">Quests, tips, and nearby places</span>
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
            <div className="flex min-h-[52px] items-center justify-between gap-3 rounded-2xl p-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-terracotta/15 text-terracotta">
                  <MoonOutlineIcon size={18} />
                </span>
                <div className="min-w-0">
                  <span className="block text-sm font-bold text-ink">Dark mode</span>
                  <span className="block text-xs text-ink-muted truncate">Use the dark heritage theme</span>
                </div>
              </div>
              <AccessibleToggle
                id="dark-theme-toggle"
                label="Dark theme"
                checked={isDarkMode}
                onToggle={toggleTheme}
              />
            </div>
          </div>
        </section>

        {/* ========================================================
            SECTION 5: SUPPORT & ABOUT
           ======================================================== */}
        <section aria-labelledby="support-title" className="mb-6">
          <div className="mb-2">
            <h2 id="support-title" className="text-xs font-bold uppercase tracking-wider text-terracotta">
              SUPPORT & ABOUT
            </h2>
          </div>

          <div className="space-y-2 rounded-3xl border border-ivory-line bg-ivory-surface p-2 shadow-xs">
            {/* Help Center */}
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl p-3 text-left hover:bg-ivory/60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage/20 text-sage-deep dark:text-sage">
                  <HelpCircleOutlineIcon size={18} />
                </span>
                <div className="min-w-0">
                  <span className="block text-sm font-bold text-ink">Help center</span>
                  <span className="block text-xs text-ink-muted truncate">FAQs, permissions, and support</span>
                </div>
              </div>
              <ChevronForwardOutlineIcon size={16} className="text-ink-muted" />
            </button>

            {/* About App */}
            <button
              type="button"
              onClick={() => setIsAboutOpen(true)}
              className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl p-3 text-left hover:bg-ivory/60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage/20 text-sage-deep dark:text-sage">
                  <InformationCircleOutlineIcon size={18} />
                </span>
                <div className="min-w-0">
                  <span className="block text-sm font-bold text-ink">About the app</span>
                  <span className="block text-xs text-ink-muted truncate">Privacy, terms, and acknowledgements</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 text-ink-body font-semibold text-xs">
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
            <h2 id="developer-title" className="text-xs font-bold uppercase tracking-wider text-terracotta">
              ABOUT THE DEVELOPER
            </h2>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-ivory-line bg-ivory-surface p-5 shadow-xs">
            {/* Red/terracotta accent left border */}
            <div className="absolute inset-y-0 left-0 w-1.5 bg-terracotta" aria-hidden="true" />
            <div className="pl-2">
              <div className="flex items-center gap-1 mb-2">
                <span className="text-xs font-black tracking-widest text-ink">LAAG TA</span>
                <span className="text-base font-black text-terracotta">bAI</span>
              </div>
              <p className="text-xs leading-relaxed text-ink-body font-medium">
                Your AI-powered companion for discovering the stories, places, and culture of Cebu.
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
                Crafted by student developers and Cebuano heritage enthusiasts to preserve local history through modern agentic mobile technology.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================
            SECTION 7: LOG OUT & DELETE ACCOUNT (BOTTOM ACTIONS)
           ======================================================== */}
        <section aria-label="Account management actions" className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setIsLogoutConfirmOpen(true)}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-ivory-line bg-ivory-surface hover:bg-ivory px-4 py-2.5 text-xs font-bold text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            <LogOutOutlineIcon size={18} />
            <span>Log out</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteConfirmOpen(true)}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-danger-line bg-danger-soft/60 hover:bg-danger-soft px-4 py-2.5 text-xs font-bold text-danger transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
          >
            <TrashOutlineIcon size={18} />
            <span>Delete account</span>
          </button>
        </section>
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
          confirmTone="navy"
          icon={<LogOutOutlineIcon size={24} />}
          onConfirm={handleConfirmLogout}
          onCancel={() => setIsLogoutConfirmOpen(false)}
        />
      )}

      {/* ========================================================
          MODAL: CONFIRM DELETE ACCOUNT
         ======================================================== */}
      {isDeleteConfirmOpen && (
        <ConfirmActionModal
          title="Delete account?"
          message="This removes your profile, saved discoveries, and progress. This action cannot be undone."
          confirmLabel="Delete account"
          confirmTone="danger"
          icon={<TrashOutlineIcon size={24} />}
          onConfirm={handleConfirmDeleteAccount}
          onCancel={() => setIsDeleteConfirmOpen(false)}
        />
      )}
    </div>
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
      className="group relative inline-flex min-h-[44px] min-w-[48px] items-center justify-center p-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy rounded-full touch-manipulation"
    >
      <span
        aria-hidden="true"
        className={`relative inline-flex h-[28px] w-[48px] shrink-0 items-center rounded-full p-[3px] border border-transparent transition-colors duration-200 ease-in-out ${
          checked
            ? 'bg-navy dark:bg-terracotta dark:border-terracotta/40'
            : 'bg-[#b8c2c9] dark:bg-[#2c3a4a] dark:border-line'
        }`}
      >
        <span
          className={`pointer-events-none block h-[22px] w-[22px] rounded-full bg-white shadow-[0px_1px_4px_rgba(36,59,83,0.25)] dark:shadow-[0px_2px_4px_rgba(0,0,0,0.6)] transition-transform duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
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
  currentLanguage: string
  onSelectLanguage: (code: 'en' | 'ceb' | 'fil') => void
  onClose: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="choose-lang-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs animate-fade-in"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="w-full max-w-sm rounded-3xl bg-ivory p-6 shadow-2xl border border-ivory-line text-ink">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-terracotta">
              APP LANGUAGE
            </div>
            <h2 id="choose-lang-title" className="text-xl font-black text-ink">
              Choose language
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close language selector"
            className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-ivory-surface text-ink-muted hover:text-ink hover:bg-ivory-line/40 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            <CloseOutlineIcon size={20} />
          </button>
        </div>

        <div role="radiogroup" aria-label="Available app languages" className="space-y-2">
          {LANGUAGES.map((lang) => {
            const isSelected =
              currentLanguage === lang.code || (currentLanguage === 'en' && lang.code === 'en')
            return (
              <button
                key={lang.code}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelectLanguage(lang.code)}
                className={`flex min-h-[50px] w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
                  isSelected
                    ? 'border-navy bg-navy/10 text-ink'
                    : 'border-ivory-line bg-ivory-surface text-ink hover:bg-ivory/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <GlobeOutlineIcon size={18} className="text-terracotta shrink-0" />
                  <span>{lang.name}</span>
                </div>
                {isSelected && (
                  <CheckmarkOutlineIcon size={18} className="text-navy shrink-0 font-bold" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Figma TopNavbar: back button, centred navy title, 40 px bottom corners. */
function TopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="sticky top-0 z-20 grid grid-cols-[3rem_1fr_3rem] items-center rounded-b-chrome bg-ivory-surface px-3 pt-[env(safe-area-inset-top)] shadow-topbar">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to profile"
        className="flex size-12 items-center justify-center rounded-full text-navy hover:text-navy-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
      >
        <ArrowBackOutlineIcon size={24} />
      </button>
      <h1 className="flex h-topbar items-center justify-center text-2xl font-bold text-navy truncate">
        {title}
      </h1>
      <span aria-hidden className="size-12" />
    </header>
  )
}

/** Permissions Component Page */
function PermissionsPage({
  permissions,
  onToggle,
  onBack,
}: {
  permissions: PermissionItem[]
  onToggle: (id: string) => void
  onBack: () => void
}) {
  return (
    <div className="animate-fade-in">
      <TopBar title="Permissions" onBack={onBack} />
      <main className="relative z-1 mx-auto max-w-lg px-4 pt-6 pb-8 focus:outline-none">
        <div className="space-y-3.5">
          {/* You're in control banner */}
          <section
            aria-label="Privacy control"
            className="rounded-3xl border border-sage/40 bg-sage/20 p-4.5 flex items-center gap-3.5"
          >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#3d5a45] text-white shadow-2xs">
            <ShieldCheckmarkOutlineIcon size={22} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-ink">You&apos;re in control</h2>
            <p className="text-xs text-ink-muted leading-relaxed mt-0.5">
              Choose what Laag ta bAI can access. You can change these settings anytime.
            </p>
          </div>
        </section>

        {/* Permission item cards */}
        <section aria-label="Permission items" className="space-y-3">
          {permissions.map((p) => (
            <article
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-ivory-line bg-ivory-surface p-4 shadow-2xs"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-terracotta/15 text-terracotta">
                  {p.id === 'location' && <LocationOutlineIcon size={20} />}
                  {p.id === 'camera' && <CameraOutlineIcon size={20} />}
                  {p.id === 'photos' && <ImagesOutlineIcon size={20} />}
                  {p.id === 'notifications' && <NotificationsOutlineIcon size={20} />}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-ink">{p.title}</h3>
                  <p className="text-xs text-ink-muted truncate mt-0.5">{p.description}</p>
                </div>
              </div>
              <AccessibleToggle
                id={`perm-${p.id}`}
                label={p.title}
                checked={p.enabled}
                onToggle={() => onToggle(p.id)}
              />
            </article>
          ))}
        </section>

        {/* Privacy Note */}
        <aside
          aria-label="Privacy note"
          className="flex items-start gap-3 rounded-2xl bg-terracotta/10 border border-terracotta/20 p-4 text-xs text-ink"
        >
          <LockClosedOutlineIcon size={18} className="shrink-0 text-terracotta mt-0.5" />
          <p className="leading-relaxed text-ink-muted">
            Laag ta bAI only uses these permissions for the features described above. Your photos and location are never sold.
          </p>
        </aside>

        {/* Done Button */}
        <div className="pt-4 pb-2">
          <button
            type="button"
            onClick={onBack}
            className="flex min-h-[50px] w-full items-center justify-center rounded-2xl bg-navy text-on-navy text-base font-bold shadow-sm transition-colors hover:bg-navy-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
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
      a: 'Download the Offline Cebu guide to keep saved places and stories available without a connection.',
    },
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-center-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs animate-fade-in"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="w-full max-w-sm rounded-3xl bg-ivory p-6 shadow-2xl border border-ivory-line text-ink">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-terracotta">
              SUPPORT
            </div>
            <h2 id="help-center-title" className="text-xl font-black text-ink">
              Help center
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help center"
            className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-ivory-surface text-ink-muted hover:text-ink hover:bg-ivory-line/40 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            <CloseOutlineIcon size={20} />
          </button>
        </div>

        <div className="space-y-3 mb-5">
          {faqs.map((faq) => (
            <article key={faq.q} className="rounded-2xl bg-sage/20 p-3.5 border border-sage/30">
              <h3 className="text-xs font-bold text-ink">{faq.q}</h3>
              <p className="mt-1 text-xs text-ink-muted leading-relaxed">{faq.a}</p>
            </article>
          ))}
        </div>

        <a
          href="mailto:support@laagtabai.com"
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-navy text-on-navy text-sm font-bold shadow-sm transition-colors hover:bg-navy-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs animate-fade-in"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="w-full max-w-sm rounded-3xl bg-ivory p-6 shadow-2xl border border-ivory-line text-ink">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-terracotta">
              ABOUT
            </div>
            <h2 id="about-dialog-title" className="text-xl font-black text-ink">
              About Laag ta bAI
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close about dialog"
            className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-ivory-surface text-ink-muted hover:text-ink hover:bg-ivory-line/40 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            <CloseOutlineIcon size={20} />
          </button>
        </div>

        <div className="rounded-2xl bg-sage/20 p-3 border border-sage/30 mb-3 flex items-center gap-1.5">
          <span className="text-xs font-black tracking-widest text-ink">LAAG TA</span>
          <span className="text-sm font-black text-terracotta">bAI</span>
        </div>

        <p className="text-xs text-ink-muted leading-relaxed mb-4">
          Laag ta bAI is an AI-powered companion for discovering Cebu&apos;s heritage through places, photos, and local stories.
        </p>

        <div className="space-y-2.5 mb-5">
          <div className="rounded-2xl bg-sage/20 p-3 border border-sage/30">
            <h3 className="text-xs font-bold text-ink">Version</h3>
            <p className="text-xs text-ink-muted mt-0.5">1.0.0 (Production Release)</p>
          </div>

          <div className="rounded-2xl bg-sage/20 p-3 border border-sage/30">
            <h3 className="text-xs font-bold text-ink">Privacy</h3>
            <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
              Your saved discoveries and profile preferences stay private to your account.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-navy text-on-navy text-sm font-bold shadow-sm transition-colors hover:bg-navy-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          Close
        </button>
      </div>
    </div>
  )
}

/** Reusable Confirmation Modal for Logout / Delete Account */
function ConfirmActionModal({
  title,
  message,
  confirmLabel,
  confirmTone,
  icon,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel: string
  confirmTone: 'navy' | 'danger'
  icon: React.ReactNode
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs animate-fade-in"
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
    >
      <div className="w-full max-w-sm rounded-3xl bg-ivory p-6 shadow-2xl border border-ivory-line text-ink">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-terracotta">
              ACCOUNT
            </div>
            <h2 id="confirm-modal-title" className="text-xl font-black text-ink">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-ivory-surface text-ink-muted hover:text-ink hover:bg-ivory-line/40 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            <CloseOutlineIcon size={20} />
          </button>
        </div>

        {/* Circular Icon representation */}
        <div className="flex justify-center my-3">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full ${
              confirmTone === 'danger'
                ? 'bg-danger-soft text-danger border border-danger-line'
                : 'bg-navy/10 text-navy border border-navy/20 dark:text-ivory'
            }`}
          >
            {icon}
          </div>
        </div>

        <p id="confirm-modal-desc" className="text-xs text-center text-ink-muted leading-relaxed mb-6">
          {message}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex min-h-[46px] items-center justify-center rounded-xl border border-ivory-line text-sm font-bold text-ink hover:bg-ivory-surface transition-colors focus-visible:outline-2 focus-visible:outline-navy"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex min-h-[46px] items-center justify-center rounded-xl text-sm font-bold text-on-navy shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
              confirmTone === 'danger'
                ? 'bg-danger hover:bg-danger/90 focus-visible:outline-danger'
                : 'bg-navy hover:bg-navy-pressed focus-visible:outline-navy'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
