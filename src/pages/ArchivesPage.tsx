import { useState, useEffect, useRef, useMemo, type TouchEvent } from 'react'
import { Link } from 'react-router'
import {
  Bookmark,
  Camera,
  CheckCircle2,
  Eye,
  History,
  MapPin,
  Star,
  Trash2,
  Undo2,
  WifiOff,
  MoreVertical,
  Compass,
  RotateCcw,
  BookOpen,
  X,
} from 'lucide-react'
import { readJson, writeJson } from '@/lib/storage'

export type Category = 'All places' | 'Landmarks' | 'Stories'

export type ActivityType = 'scanned' | 'visited' | 'viewed'

export type Place = {
  id: string
  name: string
  category: string
  categoryType: 'Landmarks' | 'Stories'
  location: string
  rating: number
  imageUrl: string
  description?: string
  tagWidth?: string
}

export type HistoryItem = {
  id: string
  landmarkId: string
  name: string
  location: string
  imageUrl: string
  activityType: ActivityType
  dateGroup: string
  timeString: string
  rawDate: number
  xpAwarded?: number
}

// Sample Cebu landmarks using genuine images from /landmarks/
const INITIAL_PLACES: Place[] = [
  {
    id: 'magellan-cross',
    name: "Magellan's Cross",
    category: 'Heritage',
    categoryType: 'Landmarks',
    location: 'Cebu City · 1.2 km',
    rating: 4.7,
    imageUrl: '/landmarks/magellan.jpg',
    description: 'Planted by Portuguese and Spanish explorers headed by Ferdinand Magellan in 1521.',
  },
  {
    id: 'basilica-del-santo-nino',
    name: 'Basilica Minore del Santo Niño',
    category: 'Church',
    categoryType: 'Landmarks',
    location: 'Cebu City · 1.0 km',
    rating: 4.9,
    imageUrl: '/landmarks/basilica.jpg',
    description: 'The oldest Roman Catholic church in the Philippines, founded in 1565.',
  },
  {
    id: 'fort-san-pedro',
    name: 'Fort San Pedro',
    category: 'Fort',
    categoryType: 'Landmarks',
    location: 'Cebu City · 1.5 km',
    rating: 4.8,
    imageUrl: '/landmarks/fort.jpg',
    description: 'Military defense fortification built by Spanish and indigenous Cebuanos.',
  },
  {
    id: 'casa-gorordo',
    name: 'Casa Gorordo Museum',
    category: 'Museum',
    categoryType: 'Stories',
    location: 'Parian, Cebu · 1.9 km',
    rating: 4.7,
    imageUrl: '/landmarks/casa.jpg',
    description: 'A 19th-century residence showcasing the lifestyle of a prominent Cebuano family.',
  },
  {
    id: 'yap-san-diego',
    name: 'Yap-San Diego Ancestral House',
    category: 'Heritage',
    categoryType: 'Stories',
    location: 'Parian, Cebu · 1.8 km',
    rating: 4.6,
    imageUrl: '/landmarks/yap.jpg',
    description: 'One of the oldest residential homes in the Philippines, built in the late 17th century.',
  },
]

const INITIAL_HISTORY: HistoryItem[] = [
  {
    id: 'h-1',
    landmarkId: 'magellan-cross',
    name: "Magellan's Cross",
    location: 'Cebu City',
    imageUrl: '/landmarks/magellan.jpg',
    activityType: 'scanned',
    dateGroup: 'Today',
    timeString: '2:45 PM',
    rawDate: Date.now() - 1000 * 60 * 60 * 2,
    xpAwarded: 50,
  },
  {
    id: 'h-2',
    landmarkId: 'basilica-del-santo-nino',
    name: 'Basilica Minore del Santo Niño',
    location: 'Cebu City',
    imageUrl: '/landmarks/basilica.jpg',
    activityType: 'visited',
    dateGroup: 'Today',
    timeString: '11:20 AM',
    rawDate: Date.now() - 1000 * 60 * 60 * 5,
    xpAwarded: 35,
  },
  {
    id: 'h-3',
    landmarkId: 'fort-san-pedro',
    name: 'Fort San Pedro',
    location: 'Cebu City',
    imageUrl: '/landmarks/fort.jpg',
    activityType: 'viewed',
    dateGroup: 'Yesterday',
    timeString: '4:15 PM',
    rawDate: Date.now() - 1000 * 60 * 60 * 26,
  },
  {
    id: 'h-4',
    landmarkId: 'casa-gorordo',
    name: 'Casa Gorordo Museum',
    location: 'Parian, Cebu',
    imageUrl: '/landmarks/casa.jpg',
    activityType: 'visited',
    dateGroup: 'Yesterday',
    timeString: '1:30 PM',
    rawDate: Date.now() - 1000 * 60 * 60 * 29,
    xpAwarded: 25,
  },
  {
    id: 'h-5',
    landmarkId: 'yap-san-diego',
    name: 'Yap-San Diego Ancestral House',
    location: 'Parian, Cebu',
    imageUrl: '/landmarks/yap.jpg',
    activityType: 'viewed',
    dateGroup: 'October 24, 2026',
    timeString: '10:00 AM',
    rawDate: Date.now() - 1000 * 60 * 60 * 72,
  },
]

const CATEGORIES: Category[] = ['All places', 'Landmarks', 'Stories']

export default function ArchivesPage() {
  const [activeCategory, setActiveCategory] = useState<Category>('All places')
  const [places, setPlaces] = useState<Place[]>(() => readJson<Place[]>('archive_favorites', INITIAL_PLACES))
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(() =>
    readJson<HistoryItem[]>('archive_history', INITIAL_HISTORY),
  )

  // Real offline detection
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  // Undo notification state
  const [undoToast, setUndoToast] = useState<{
    message: string
    onUndo: () => void
  } | null>(null)
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Confirmation dialog state for "Clear history"
  const [isClearHistoryOpen, setIsClearHistoryOpen] = useState(false)
  const clearDialogCancelBtnRef = useRef<HTMLButtonElement | null>(null)

  // Sync to local storage
  useEffect(() => {
    writeJson('archive_favorites', places)
  }, [places])

  useEffect(() => {
    writeJson('archive_history', historyItems)
  }, [historyItems])

  // Listen to browser offline / online events
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Auto-dismiss undo notification after 6 seconds
  const triggerUndoToast = (message: string, onUndo: () => void) => {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current)
    setUndoToast({ message, onUndo })
    undoTimeoutRef.current = setTimeout(() => {
      setUndoToast(null)
    }, 6000)
  }

  // Handle removing a favorite with undo
  const handleRemoveFavorite = (place: Place) => {
    const previous = [...places]
    setPlaces((prev) => prev.filter((p) => p.id !== place.id))
    triggerUndoToast(`Removed "${place.name}" from favorites`, () => {
      setPlaces(previous)
      setUndoToast(null)
    })
  }

  // Handle deleting a single history item with undo
  const handleDeleteHistoryItem = (item: HistoryItem) => {
    const previous = [...historyItems]
    setHistoryItems((prev) => prev.filter((h) => h.id !== item.id))
    triggerUndoToast(`Deleted "${item.name}" from history`, () => {
      setHistoryItems(previous)
      setUndoToast(null)
    })
  }

  // Handle clearing all history with undo
  const handleConfirmClearHistory = () => {
    const previous = [...historyItems]
    setHistoryItems([])
    setIsClearHistoryOpen(false)
    triggerUndoToast('All visit history cleared', () => {
      setHistoryItems(previous)
      setUndoToast(null)
    })
  }

  // Reset sample data helper
  const handleResetSampleData = () => {
    setPlaces(INITIAL_PLACES)
    setHistoryItems(INITIAL_HISTORY)
    setUndoToast(null)
  }

  // Filtered favorites
  const filteredPlaces = useMemo(() => {
    if (activeCategory === 'All places') return places
    return places.filter((p) => p.categoryType === activeCategory)
  }, [activeCategory, places])

  // Group history by date (newest first)
  const groupedHistory = useMemo(() => {
    const sorted = [...historyItems].sort((a, b) => b.rawDate - a.rawDate)
    const groups: { [group: string]: HistoryItem[] } = {}
    for (const item of sorted) {
      if (!groups[item.dateGroup]) groups[item.dateGroup] = []
      groups[item.dateGroup].push(item)
    }
    return Object.entries(groups)
  }, [historyItems])

  const isBothEmpty = places.length === 0 && historyItems.length === 0

  return (
    <div
      className="relative min-h-dvh min-h-screen -mb-nav bg-[#FAF5EC] text-[#243B53]"
      style={{
        marginBottom: 'calc(-96px - env(safe-area-inset-bottom))',
        paddingBottom: 'calc(128px + env(safe-area-inset-bottom))',
      }}
    >
      {/* Background Decorative Ambient Layers */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            'radial-gradient(circle at 10% 20%, rgba(155, 175, 154, 0.25) 0%, transparent 40%), radial-gradient(circle at 90% 60%, rgba(198, 107, 78, 0.15) 0%, transparent 45%)',
        }}
        aria-hidden="true"
      />

      {/* Accessible skip link */}
      <a
        href="#main-archive-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-[#243B53] focus:text-[#FAF5EC] focus:px-4 focus:py-2.5 focus:font-bold focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#C66B4E]"
      >
        Skip to archive content
      </a>

      {/* Offline Status Banner */}
      {isOffline && (
        <section
          role="status"
          aria-live="polite"
          className="relative z-10 mx-4 mt-3 flex items-center justify-between gap-3 rounded-2xl border border-[#C66B4E]/30 bg-[#C66B4E]/10 p-3.5 text-xs text-[#9E4F3A]"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C66B4E]/20 text-[#9E4F3A]">
              <WifiOff className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="font-bold text-sm">Offline Mode Active</p>
              <p className="text-[#334E68]">Showing bookmarked Cebu landmarks & cached visit history.</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-[#C66B4E]/30 bg-[#FAF5EC] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#9E4F3A]">
            Cached
          </span>
        </section>
      )}

      {/* Main Page Container */}
      <main id="main-archive-content" tabIndex={-1} className="relative z-10 mx-auto max-w-lg px-4 pt-5 focus:outline-none">
        {/* Header Section */}
        <header className="mb-6">
          <div className="text-xs font-bold uppercase tracking-[1.44px] text-[#9E4F3A] mb-1">
            YOUR COLLECTION
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#243B53]">
            Saved Places
          </h1>
          <p className="mt-1 text-sm text-[#55687D] leading-relaxed">
            Places and stories you saved for later.
          </p>
        </header>

        {isBothEmpty ? (
          /* BOTH EMPTY STATE */
          <EmptyBothView onReset={handleResetSampleData} />
        ) : (
          /* FAVORITES (TOP) & HISTORY (BOTTOM) */
          <div className="space-y-10">
            {/* ========================================================
                SECTION 1: FAVORITES (TOP SECTION)
               ======================================================== */}
            <section aria-labelledby="favorites-heading">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-[#C66B4E]" aria-hidden="true" />
                  <h2 id="favorites-heading" className="text-xl font-bold tracking-tight text-[#243B53]">
                    Bookmarked Landmarks
                  </h2>
                </div>
                <span className="text-xs font-bold text-[#55687D] bg-[#243B53]/5 px-2.5 py-1 rounded-full border border-[#243B53]/10">
                  {places.length} {places.length === 1 ? 'place' : 'places'}
                </span>
              </div>

              {/* Category Filter Pills (All places, Landmarks, Stories) */}
              <nav
                aria-label="Category filters"
                role="tablist"
                className="flex items-center gap-2 overflow-x-auto pb-1 mb-5 scrollbar-none"
              >
                {CATEGORIES.map((category) => {
                  const isActive = activeCategory === category
                  const count =
                    category === 'All places'
                      ? places.length
                      : places.filter((p) => p.categoryType === category).length

                  return (
                    <button
                      key={category}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveCategory(category)}
                      className={`min-h-[44px] min-w-[44px] px-4 py-2 rounded-full text-sm font-bold border transition-all duration-150 flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C66B4E] focus-visible:ring-offset-2 ${
                        isActive
                          ? 'bg-[#C66B4E] text-[#FAF5EC] border-[#C66B4E] shadow-sm'
                          : 'bg-[#FAF5EC] text-[#243B53] border-[#243B53]/15 hover:bg-[#243B53]/5'
                      }`}
                    >
                      <span>{category}</span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${
                          isActive ? 'bg-[#FAF5EC]/25 text-[#FAF5EC]' : 'bg-[#243B53]/10 text-[#55687D]'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  )
                })}
              </nav>

              {/* Favorites Card List or Empty State */}
              {places.length === 0 ? (
                <EmptyFavoritesView onReset={() => setPlaces(INITIAL_PLACES)} />
              ) : filteredPlaces.length === 0 ? (
                <div className="rounded-2xl border border-[#243B53]/10 bg-[#FAF5EC] p-6 text-center shadow-xs">
                  <p className="text-sm font-semibold text-[#55687D]">
                    No saved places match the &quot;{activeCategory}&quot; category.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveCategory('All places')}
                    className="mt-3 min-h-[44px] px-4 py-2 text-xs font-bold text-[#9E4F3A] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C66B4E]"
                  >
                    View all saved places
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5">
                  {filteredPlaces.map((place) => (
                    <PlaceCard
                      key={place.id}
                      place={place}
                      onRemove={() => handleRemoveFavorite(place)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* CLEAR SECTION SEPARATOR */}
            <hr className="border-t-2 border-[#243B53]/10" aria-hidden="true" />

            {/* ========================================================
                SECTION 2: HISTORY (BOTTOM SECTION)
               ======================================================== */}
            <section aria-labelledby="history-heading">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-[#C66B4E]" aria-hidden="true" />
                  <h2 id="history-heading" className="text-xl font-bold tracking-tight text-[#243B53]">
                    Visit History
                  </h2>
                </div>
                {historyItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsClearHistoryOpen(true)}
                    className="min-h-[44px] px-3 py-1.5 text-xs font-bold text-[#9E4F3A] hover:text-[#C66B4E] hover:bg-[#C66B4E]/10 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C66B4E]"
                    aria-label="Clear all visit history"
                  >
                    Clear history
                  </button>
                )}
              </div>
              <p className="text-xs text-[#55687D] mb-4">
                Your historical scans, visits, and viewed stories, grouped newest first.
              </p>

              {/* History List or Empty State */}
              {historyItems.length === 0 ? (
                <EmptyHistoryView onReset={() => setHistoryItems(INITIAL_HISTORY)} />
              ) : (
                <div className="space-y-6">
                  {groupedHistory.map(([dateGroup, items]) => (
                    <div key={dateGroup} className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#9E4F3A]">
                          {dateGroup}
                        </span>
                        <div className="h-px flex-1 bg-[#243B53]/10" aria-hidden="true" />
                        <span className="text-[11px] font-semibold text-[#55687D]">
                          {items.length} {items.length === 1 ? 'activity' : 'activities'}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {items.map((item) => (
                          <HistoryRow
                            key={item.id}
                            item={item}
                            onDelete={() => handleDeleteHistoryItem(item)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Accessible Undo Toast Notification */}
      {undoToast && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-24 inset-x-4 z-40 mx-auto max-w-md animate-fade-in"
        >
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#243B53] text-[#FAF5EC] px-4 py-3 shadow-xl border border-[#FAF5EC]/15">
            <span className="text-xs font-semibold truncate flex-1">{undoToast.message}</span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={undoToast.onUndo}
                className="min-h-[44px] min-w-[44px] px-3 py-1 rounded-xl bg-[#C66B4E] hover:bg-[#d07355] text-[#FAF5EC] text-xs font-bold flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAF5EC]"
              >
                <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Undo</span>
              </button>
              <button
                type="button"
                onClick={() => setUndoToast(null)}
                aria-label="Dismiss undo message"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#FAF5EC]/70 hover:text-[#FAF5EC] rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAF5EC]"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Confirmation Modal for "Clear history" */}
      {isClearHistoryOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-history-title"
          aria-describedby="clear-history-desc"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#243B53]/60 backdrop-blur-xs animate-fade-in"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsClearHistoryOpen(false)
          }}
        >
          <div className="w-full max-w-sm rounded-3xl bg-[#FAF5EC] p-6 shadow-2xl border border-[#243B53]/15 text-[#243B53]">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#C66B4E]/15 text-[#9E4F3A]">
                <Trash2 className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 id="clear-history-title" className="text-lg font-bold">
                Clear visit history?
              </h3>
            </div>
            <p id="clear-history-desc" className="text-sm text-[#55687D] leading-relaxed mb-6">
              Are you sure you want to delete your entire activity history? This will remove all your
              scanned, visited, and viewed landmark records.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                ref={clearDialogCancelBtnRef}
                type="button"
                onClick={() => setIsClearHistoryOpen(false)}
                className="min-h-[44px] px-4 py-2.5 rounded-2xl border border-[#243B53]/20 text-sm font-bold text-[#243B53] hover:bg-[#243B53]/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C66B4E]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearHistory}
                className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-[#C66B4E] hover:bg-[#b55e42] text-sm font-bold text-[#FAF5EC] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#243B53]"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* =========================================================================
   SUBCOMPONENTS
   ========================================================================= */

/** Favorite Landmark Card matching Figma design with genuine Cebu photos */
function PlaceCard({ place, onRemove }: { place: Place; onRemove: () => void }) {
  return (
    <article
      aria-label={place.name}
      className="group relative flex flex-col rounded-3xl bg-[#FAF5EC] border border-[#243B53]/15 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
    >
      {/* Hero Image Container */}
      <div className="relative h-44 w-full overflow-hidden bg-[#e6ede4]">
        <img
          src={place.imageUrl}
          alt={`Photo of ${place.name}`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Category Badge (Terracotta Pill Top-Left) */}
        <span className="absolute top-3 left-3 flex items-center h-7 px-3 rounded-full bg-[#C66B4E] text-[#FAF5EC] text-xs font-bold shadow-sm tracking-wide">
          {place.category}
        </span>

        {/* Visible Bookmark Indicator Button (Top-Right) */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onRemove()
          }}
          aria-label={`Remove ${place.name} from bookmarked favorites`}
          aria-pressed="true"
          title="Remove from favorites"
          className="min-h-[44px] min-w-[44px] absolute top-2 right-2 flex items-center justify-center rounded-full bg-[#243B53]/85 text-[#FAF5EC] border border-[#FAF5EC]/30 backdrop-blur-md shadow-md hover:bg-[#243B53] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C66B4E] focus-visible:ring-offset-2"
        >
          <Bookmark className="w-5 h-5 fill-[#FAF5EC] text-[#FAF5EC]" aria-hidden="true" />
        </button>

        {/* Bottom subtle gradient shadow for contrast */}
        <div
          className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#243B53]/60 to-transparent pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* Card Content Footer */}
      <div className="flex items-center justify-between p-4 bg-[#FAF5EC]">
        <div className="min-w-0 flex-1 pr-3">
          <Link
            to={`/landmarks/${place.id}`}
            className="block text-lg font-bold text-[#243B53] hover:text-[#C66B4E] transition-colors truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C66B4E] rounded-md"
          >
            {place.name}
          </Link>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-[#55687D]">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-[#9E4F3A]" aria-hidden="true" />
            <span className="truncate">{place.location}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 rounded-xl bg-[#243B53]/5 px-2.5 py-1.5 border border-[#243B53]/10">
          <Star className="w-4 h-4 fill-[#C66B4E] text-[#C66B4E]" aria-hidden="true" />
          <span className="text-xs font-bold text-[#9E4F3A]">{place.rating.toFixed(1)}</span>
        </div>
      </div>
    </article>
  )
}

/** History Row with swipeable action & accessible menu button alternative */
function HistoryRow({ item, onDelete }: { item: HistoryItem; onDelete: () => void }) {
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [offsetX, setOffsetX] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close accessible dropdown on click outside
  useEffect(() => {
    if (!isMenuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMenuOpen])

  // Touch swipe handlers
  const handleTouchStart = (e: TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (touchStartX === null) return
    const currentX = e.touches[0].clientX
    const diff = currentX - touchStartX
    // Only allow swiping left up to 80px
    if (diff < 0) {
      setOffsetX(Math.max(diff, -80))
    } else {
      setOffsetX(0)
    }
  }

  const handleTouchEnd = () => {
    if (offsetX < -40) {
      setOffsetX(-72) // snap open swipe delete
    } else {
      setOffsetX(0) // snap back
    }
    setTouchStartX(null)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#C66B4E]/15">
      {/* Swipe Reveal Action (Delete button under slider) */}
      <div className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-[#C66B4E] text-[#FAF5EC]">
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${item.name} from history`}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center font-bold text-xs"
        >
          <Trash2 className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Main Foreground Card that slides */}
      <div
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative flex items-center justify-between gap-3 rounded-2xl border border-[#243B53]/15 bg-[#FAF5EC] p-3 transition-transform duration-150 ease-out shadow-2xs"
      >
        {/* Landmark Thumbnail */}
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#243B53]/10 bg-[#e6ede4]">
          <img
            src={item.imageUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>

        {/* Landmark Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              to={`/landmarks/${item.landmarkId}`}
              className="text-sm font-bold text-[#243B53] hover:text-[#C66B4E] transition-colors truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C66B4E] rounded"
            >
              {item.name}
            </Link>
            {item.xpAwarded && (
              <span className="shrink-0 rounded-md bg-[#536B58]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#2F4F34]">
                +{item.xpAwarded} XP
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-2 text-xs text-[#55687D]">
            <span>{item.timeString}</span>
            <span>•</span>
            <span>{item.location}</span>
          </div>

          <div className="mt-2">
            <ActivityBadge activityType={item.activityType} />
          </div>
        </div>

        {/* Accessible Alternative: Options Menu Button */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label={`Options for ${item.name}`}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#55687D] hover:text-[#243B53] rounded-xl hover:bg-[#243B53]/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C66B4E]"
          >
            <MoreVertical className="w-5 h-5" aria-hidden="true" />
          </button>

          {isMenuOpen && (
            <div
              role="menu"
              aria-label={`Actions for ${item.name}`}
              className="absolute right-0 top-11 z-30 w-44 rounded-2xl border border-[#243B53]/15 bg-[#FAF5EC] p-1.5 shadow-xl animate-fade-in"
            >
              <Link
                to={`/landmarks/${item.landmarkId}`}
                role="menuitem"
                onClick={() => setIsMenuOpen(false)}
                className="flex min-h-[44px] w-full items-center gap-2 rounded-xl px-3 text-xs font-semibold text-[#243B53] hover:bg-[#243B53]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C66B4E]"
              >
                <Eye className="w-4 h-4 text-[#55687D]" aria-hidden="true" />
                <span>View story</span>
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false)
                  onDelete()
                }}
                className="flex min-h-[44px] w-full items-center gap-2 rounded-xl px-3 text-xs font-bold text-[#9E4F3A] hover:bg-[#C66B4E]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C66B4E]"
              >
                <Trash2 className="w-4 h-4 text-[#9E4F3A]" aria-hidden="true" />
                <span>Delete from history</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Distinct activity tag: Scanned, Visited, and Viewed tags are distinguishable by icon and label, not color alone */
function ActivityBadge({ activityType }: { activityType: ActivityType }) {
  if (activityType === 'scanned') {
    return (
      <span
        aria-label="Activity type: Scanned"
        className="inline-flex items-center gap-1.5 rounded-md border border-[#243B53]/25 bg-[#243B53]/10 px-2 py-0.5 text-[11px] font-bold text-[#243B53]"
      >
        <Camera className="w-3.5 h-3.5 shrink-0 text-[#243B53]" aria-hidden="true" />
        <span>Scanned</span>
      </span>
    )
  }

  if (activityType === 'visited') {
    return (
      <span
        aria-label="Activity type: Visited"
        className="inline-flex items-center gap-1.5 rounded-md border border-[#536B58]/35 bg-[#536B58]/15 px-2 py-0.5 text-[11px] font-bold text-[#2F4F34]"
      >
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#2F4F34]" aria-hidden="true" />
        <span>Visited</span>
      </span>
    )
  }

  return (
    <span
      aria-label="Activity type: Viewed"
      className="inline-flex items-center gap-1.5 rounded-md border border-[#C66B4E]/35 bg-[#C66B4E]/15 px-2 py-0.5 text-[11px] font-bold text-[#9E4F3A]"
    >
      <Eye className="w-3.5 h-3.5 shrink-0 text-[#9E4F3A]" aria-hidden="true" />
      <span>Viewed</span>
    </span>
  )
}

/** Empty State when only Favorites is empty */
function EmptyFavoritesView({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-3xl border border-[#243B53]/15 bg-[#FAF5EC] p-8 text-center shadow-xs">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C66B4E]/10 text-[#C66B4E] mb-3">
        <Bookmark className="w-7 h-7" aria-hidden="true" />
      </div>
      <h3 className="text-base font-bold text-[#243B53]">No saved places yet</h3>
      <p className="mt-1 text-xs text-[#55687D] max-w-xs mx-auto leading-relaxed">
        Tap the bookmark icon on any Cebu landmark to save it here for quick offline access and itinerary planning.
      </p>
      <div className="mt-5 flex items-center justify-center gap-3">
        <Link
          to="/"
          className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-[#C66B4E] hover:bg-[#b55e42] text-xs font-bold text-[#FAF5EC] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#243B53]"
        >
          Explore Landmarks
        </Link>
        <button
          type="button"
          onClick={onReset}
          className="min-h-[44px] px-4 py-2.5 rounded-2xl border border-[#243B53]/20 hover:bg-[#243B53]/5 text-xs font-bold text-[#243B53] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C66B4E]"
        >
          Load Samples
        </button>
      </div>
    </div>
  )
}

/** Empty State when only History is empty */
function EmptyHistoryView({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-3xl border border-[#243B53]/15 bg-[#FAF5EC] p-8 text-center shadow-xs">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#243B53]/10 text-[#243B53] mb-3">
        <History className="w-7 h-7" aria-hidden="true" />
      </div>
      <h3 className="text-base font-bold text-[#243B53]">No activity history yet</h3>
      <p className="mt-1 text-xs text-[#55687D] max-w-xs mx-auto leading-relaxed">
        Landmarks you scan with the camera, check into, or read about will appear here chronologically.
      </p>
      <div className="mt-5 flex items-center justify-center gap-3">
        <Link
          to="/scan"
          className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-[#243B53] hover:bg-[#1a2c3f] text-xs font-bold text-[#FAF5EC] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C66B4E]"
        >
          Scan a Landmark
        </Link>
        <button
          type="button"
          onClick={onReset}
          className="min-h-[44px] px-4 py-2.5 rounded-2xl border border-[#243B53]/20 hover:bg-[#243B53]/5 text-xs font-bold text-[#243B53] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C66B4E]"
        >
          Load Samples
        </button>
      </div>
    </div>
  )
}

/** Combined Empty State when both Favorites & History are empty */
function EmptyBothView({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-3xl border border-[#243B53]/15 bg-[#FAF5EC] p-10 text-center shadow-sm my-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#C66B4E]/15 text-[#9E4F3A] mb-4">
        <BookOpen className="w-8 h-8" aria-hidden="true" />
      </div>
      <h2 className="text-2xl font-black text-[#243B53]">Your Archives Are Empty</h2>
      <p className="mt-2 text-sm text-[#55687D] max-w-sm mx-auto leading-relaxed">
        Start building your Cebu journey! Bookmark heritage sites to read offline and scan landmarks
        with your camera as you explore to grow your travel history.
      </p>

      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          to="/"
          className="min-h-[44px] w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-[#C66B4E] hover:bg-[#b55e42] text-sm font-bold text-[#FAF5EC] transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#243B53]"
        >
          <Compass className="w-4 h-4" aria-hidden="true" />
          <span>Explore Landmarks</span>
        </Link>
        <Link
          to="/scan"
          className="min-h-[44px] w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-[#243B53] hover:bg-[#1a2c3f] text-sm font-bold text-[#FAF5EC] transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C66B4E]"
        >
          <Camera className="w-4 h-4" aria-hidden="true" />
          <span>Scan Landmarks</span>
        </Link>
        <button
          type="button"
          onClick={onReset}
          className="min-h-[44px] w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-[#243B53]/25 hover:bg-[#243B53]/5 text-sm font-bold text-[#243B53] transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C66B4E]"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          <span>Restore Examples</span>
        </button>
      </div>
    </div>
  )
}
