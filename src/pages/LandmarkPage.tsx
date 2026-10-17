import { Link, useParams } from 'react-router'
import { Bookmark, BookmarkCheck, Clock, MapPinCheck, MessageCircle, Star, Ticket, Users } from 'lucide-react'
import { useCheckIn, useLandmark } from '@/api/hooks'
import { LandmarkImage } from '@/components/LandmarkCard'
import { PageHeader } from '@/components/PageHeader'
import { ErrorMessage, Loading } from '@/components/StateMessage'
import { StorySection } from '@/components/StorySection'
import { useAuth } from '@/features/auth/AuthContext'
import { useBookmarks } from '@/features/bookmarks/useBookmarks'
import { CATEGORY_LABELS, formatFee } from '@/lib/format'

export default function LandmarkPage() {
  const { id } = useParams()
  const { bookmarks, isSaved, toggle } = useBookmarks()
  const auth = useAuth()
  const checkIn = useCheckIn()
  const query = useLandmark(id)

  // Offline fallback: read the saved copy when the network request fails (SRS 3.6.3.2).
  const landmark = query.data ?? bookmarks.find((b) => b.id === id)

  if (query.isPending && !landmark) return <Loading />
  if (!landmark) return <ErrorMessage error={query.error} onRetry={() => query.refetch()} />

  const saved = isSaved(landmark.id)
  return (
    <article>
      <PageHeader
        back
        title={landmark.name}
        subtitle={`${CATEGORY_LABELS[landmark.category]} • ${landmark.district}`}
        action={
          <button
            type="button"
            onClick={() => toggle(landmark)}
            aria-pressed={saved}
            aria-label={saved ? 'Remove bookmark' : 'Save for offline reading'}
            className="touch-target flex items-center justify-center rounded-full text-primary"
          >
            {saved ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />}
          </button>
        }
      />

      <div className="px-5">
        <LandmarkImage src={landmark.imageUrl} alt={landmark.name} className="h-56 w-full rounded-3xl" />

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Fact icon={<Star size={16} className="fill-gold text-gold" />} label="Rating" value={`${landmark.rating.toFixed(1)} / 5`} />
          <Fact icon={<Users size={16} />} label="Visits" value={landmark.visitCount.toLocaleString()} />
          <Fact icon={<Clock size={16} />} label="Typical visit" value={`${landmark.estimatedVisitMinutes} min`} />
          <Fact icon={<Ticket size={16} />} label="Admission" value={formatFee(landmark.admissionFee)} />
        </dl>
        <p className="mt-3 text-sm text-muted">
          <span className="font-semibold text-fg">Hours:</span> {landmark.visitingHours}
        </p>

        <div className="mt-5 flex gap-3">
          <Link
            to={`/landmarks/${landmark.id}/chat`}
            className="touch-target flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-on-primary"
          >
            <MessageCircle size={20} aria-hidden /> Ask bAI
          </Link>
          {auth.status === 'signed-in' && (
            <button
              type="button"
              onClick={() => checkIn.mutate(landmark.id)}
              disabled={checkIn.isPending}
              className="touch-target flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-4 font-bold disabled:opacity-60"
            >
              <MapPinCheck size={20} aria-hidden /> {checkIn.isSuccess ? 'Checked in' : "I'm here"}
            </button>
          )}
        </div>
        {checkIn.isError && <ErrorMessage error={checkIn.error} />}

        <div className="mt-6 space-y-3">
          <StorySection title="About" text={landmark.story.about} defaultOpen />
          <StorySection title="Historical Significance" text={landmark.story.significance} />
          <StorySection title="Architecture" text={landmark.story.architecture} />
          <StorySection title="Trivia & Folklore" text={landmark.story.trivia} />
        </div>
      </div>
    </article>
  )
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <dt className="flex items-center gap-1 text-xs uppercase text-muted">
        <span aria-hidden>{icon}</span> {label}
      </dt>
      <dd className="mt-1 font-bold">{value}</dd>
    </div>
  )
}
