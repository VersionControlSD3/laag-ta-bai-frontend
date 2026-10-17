import { useState } from 'react'
import { Link } from 'react-router'
import { BookOpen, History } from 'lucide-react'
import { useLandmarks, useMe } from '@/api/hooks'
import { LandmarkRow } from '@/components/LandmarkCard'
import { PageHeader } from '@/components/PageHeader'
import { SignInPrompt } from '@/components/SignInPrompt'
import { EmptyState, ErrorMessage, Loading } from '@/components/StateMessage'
import { useAuth } from '@/features/auth/AuthContext'
import { useBookmarks } from '@/features/bookmarks/useBookmarks'
import { formatTime } from '@/lib/format'

/** Saved stories (available offline) and visit history. */
export default function ArchivesPage() {
  const [tab, setTab] = useState<'saved' | 'history'>('saved')
  return (
    <div>
      <PageHeader title="Archives" subtitle="Your saved stories and journeys" />
      <div className="mx-5 mb-5 grid grid-cols-2 rounded-2xl bg-surface p-1" role="tablist">
        {(['saved', 'history'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`touch-target rounded-xl font-bold ${tab === t ? 'bg-primary text-on-primary' : ''}`}
          >
            {t === 'saved' ? 'Saved' : 'History'}
          </button>
        ))}
      </div>
      {tab === 'saved' ? <Saved /> : <VisitHistory />}
    </div>
  )
}

function Saved() {
  const { bookmarks } = useBookmarks()
  if (bookmarks.length === 0)
    return (
      <EmptyState icon={<BookOpen size={32} />} title="No saved stories yet">
        Tap the bookmark on any landmark to read it offline.
      </EmptyState>
    )
  return (
    <div className="space-y-3 px-5">
      {bookmarks.map((b) => <LandmarkRow key={b.id} landmark={b} />)}
    </div>
  )
}

function VisitHistory() {
  const auth = useAuth()
  const me = useMe()
  const landmarks = useLandmarks()
  if (auth.status !== 'signed-in') return <SignInPrompt message="Sign in to keep a history of the places you visit." />
  if (me.isPending) return <Loading />
  if (me.isError) return <ErrorMessage error={me.error} onRetry={() => me.refetch()} />
  if (me.data.recentVisits.length === 0)
    return (
      <EmptyState icon={<History size={32} />} title="No visits yet">
        Scan a landmark or chat with bAI to start your journey.
      </EmptyState>
    )
  const names = new Map(landmarks.data?.map((l) => [l.id, l.name]))
  return (
    <ol className="space-y-2 px-5">
      {me.data.recentVisits.map((v) => (
        <li key={v.id}>
          <Link to={`/landmarks/${v.landmarkId}`} className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4">
            <div>
              <p className="font-bold">{names.get(v.landmarkId) ?? v.landmarkId}</p>
              <p className="text-xs text-muted">
                {formatTime(v.createdAt)} • {v.source}
              </p>
            </div>
            {v.xpAwarded > 0 && <span className="text-sm font-bold text-primary">+{v.xpAwarded} XP</span>}
          </Link>
        </li>
      ))}
    </ol>
  )
}
