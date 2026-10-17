import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Award, LogOut, Pencil } from 'lucide-react'
import { useMe, useUpdateMe } from '@/api/hooks'
import type { Me } from '@/api/types'
import { PageHeader } from '@/components/PageHeader'
import { SignInPrompt } from '@/components/SignInPrompt'
import { ErrorMessage, Loading } from '@/components/StateMessage'
import { XpBar } from '@/components/XpBar'
import { useAuth } from '@/features/auth/AuthContext'
import { resetBookmarksCache } from '@/features/bookmarks/useBookmarks'
import { usePreferences, type ThemeMode } from '@/features/preferences/PreferencesContext'
import { env } from '@/lib/env'
import { clearOfflineCache } from '@/lib/storage'

export default function ProfilePage() {
  const auth = useAuth()
  const me = useMe()
  return (
    <div>
      <PageHeader title="Profile" />
      {auth.status !== 'signed-in' ? (
        <SignInPrompt message="Sign in to set up your traveler profile." />
      ) : me.isPending ? (
        <Loading />
      ) : me.isError ? (
        <ErrorMessage error={me.error} onRetry={() => me.refetch()} />
      ) : (
        <ProfileCard me={me.data} />
      )}
      <Settings />
    </div>
  )
}

function ProfileCard({ me }: { me: Me }) {
  const [editing, setEditing] = useState(false)
  const initials = me.profile.displayName.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <section className="mx-5 rounded-3xl border border-line bg-surface p-5 text-center">
      {me.profile.avatarUrl ? (
        <img src={me.profile.avatarUrl} alt="" className="mx-auto h-24 w-24 rounded-full border-4 border-gold object-cover" />
      ) : (
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-gold bg-surface-strong text-3xl font-extrabold text-primary" aria-hidden>
          {initials || '?'}
        </div>
      )}
      <h2 className="mt-3 text-2xl font-extrabold">{me.profile.displayName}</h2>
      <p className="text-sm font-semibold text-coral">
        Level {me.rank.level} · {me.rank.title}
      </p>
      {me.profile.nationality && <p className="text-sm text-muted">{me.profile.nationality}</p>}
      {me.profile.bio && <p className="mt-2 text-sm">{me.profile.bio}</p>}
      <div className="mt-4 text-left">
        <XpBar rank={me.rank} />
      </div>
      {me.badges.length > 0 && (
        <ul className="mt-4 flex flex-wrap justify-center gap-2" aria-label="Badges">
          {me.badges.map((b) => (
            <li key={b.questId} className="flex items-center gap-1 rounded-full bg-gold px-3 py-1 text-xs font-bold text-maroon">
              <Award size={14} aria-hidden /> {b.name}
            </li>
          ))}
        </ul>
      )}
      {editing ? (
        <EditProfile me={me} onDone={() => setEditing(false)} />
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="touch-target mx-auto mt-4 flex items-center gap-2 rounded-2xl border border-line px-5 font-bold">
          <Pencil size={16} aria-hidden /> Edit profile
        </button>
      )}
    </section>
  )
}

function EditProfile({ me, onDone }: { me: Me; onDone: () => void }) {
  const update = useUpdateMe()
  const [form, setForm] = useState({
    displayName: me.profile.displayName,
    nationality: me.profile.nationality ?? '',
    bio: me.profile.bio ?? '',
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    update.mutate(
      { displayName: form.displayName, nationality: form.nationality || null, bio: form.bio || null },
      { onSuccess: onDone },
    )
  }
  const field = 'mt-1 h-12 w-full rounded-xl border border-line bg-bg px-3'
  return (
    <form onSubmit={submit} className="mt-4 space-y-3 text-left">
      <label className="block text-sm font-semibold">
        Display name
        <input required maxLength={60} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className={field} />
      </label>
      <label className="block text-sm font-semibold">
        Nationality
        <input maxLength={60} value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} className={field} />
      </label>
      <label className="block text-sm font-semibold">
        Travel bio
        <textarea maxLength={280} rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="mt-1 w-full rounded-xl border border-line bg-bg p-3" />
      </label>
      {update.isError && <ErrorMessage error={update.error} />}
      <div className="flex gap-2">
        <button type="button" onClick={onDone} className="touch-target flex-1 rounded-2xl border border-line font-bold">Cancel</button>
        <button type="submit" disabled={update.isPending} className="touch-target flex-1 rounded-2xl bg-primary font-bold text-on-primary disabled:opacity-60">Save</button>
      </div>
    </form>
  )
}

/** App preferences (SRS 3.1.6.2). */
function Settings() {
  const prefs = usePreferences()
  const auth = useAuth()
  const update = useUpdateMe()
  const queryClient = useQueryClient()
  const [cleared, setCleared] = useState(false)

  const setLanguage = (language: 'en' | 'ceb') => {
    prefs.update({ language })
    if (auth.status === 'signed-in') update.mutate({ language })
  }

  return (
    <section className="mx-5 mt-6 space-y-2" aria-labelledby="settings-title">
      <h2 id="settings-title" className="mb-2 text-xl font-bold">Settings</h2>

      <Row label="Appearance">
        <select value={prefs.theme} onChange={(e) => prefs.update({ theme: e.target.value as ThemeMode })} className="h-10 rounded-xl border border-line bg-bg px-2" aria-label="Appearance">
          <option value="system">System default</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </Row>
      <Row label="Language">
        <select value={prefs.language} onChange={(e) => setLanguage(e.target.value as 'en' | 'ceb')} className="h-10 rounded-xl border border-line bg-bg px-2" aria-label="Language">
          <option value="en">English</option>
          <option value="ceb">Cebuano / Bisaya</option>
        </select>
      </Row>
      <Toggle label="Proximity alerts" checked={prefs.proximityAlerts} onChange={(v) => prefs.update({ proximityAlerts: v })} />
      <Toggle label="Daily streak reminders" checked={prefs.streakReminders} onChange={(v) => prefs.update({ streakReminders: v })} />
      <Toggle label="Quest completion notices" checked={prefs.questNotices} onChange={(v) => prefs.update({ questNotices: v })} />

      <Row label="Offline storage">
        <button
          type="button"
          onClick={() => {
            clearOfflineCache()
            resetBookmarksCache()
            queryClient.clear()
            setCleared(true)
          }}
          className="touch-target rounded-xl px-3 text-sm font-bold text-coral"
        >
          {cleared ? 'Cleared' : 'Clear cache'}
        </button>
      </Row>
      <Row label="About">
        <span className="text-sm text-muted">Laag ta bAI v{env.appVersion} (Alpha)</span>
      </Row>

      {auth.status === 'signed-in' && (
        <button type="button" onClick={() => auth.signOut()} className="touch-target mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-crimson font-bold text-white">
          <LogOut size={18} aria-hidden /> Log out
        </button>
      )}
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-14 items-center justify-between rounded-2xl border border-line bg-surface px-4">
      <span className="font-semibold">{label}</span>
      {children}
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between rounded-2xl border border-line bg-surface px-4">
      <span className="font-semibold">{label}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-6 w-6 accent-amber" />
    </label>
  )
}
