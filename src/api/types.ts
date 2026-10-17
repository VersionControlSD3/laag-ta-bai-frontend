// Mirrors laag-ta-bai-api/openapi.yaml. Update both in the same change.

export type LandmarkCategory = 'church' | 'fort' | 'monument' | 'museum' | 'heritage_house' | 'temple'

export type LandmarkStory = {
  about: string
  significance: string
  architecture: string
  trivia: string
}

export type LandmarkSummary = {
  id: string
  name: string
  category: LandmarkCategory
  district: string
  latitude: number
  longitude: number
  imageUrl: string | null
  admissionFee: number
  rating: number
  visitCount: number
  estimatedVisitMinutes: number
  visitingHours: string
  distanceMeters?: number
}

export type Landmark = LandmarkSummary & { story: LandmarkStory }

export type QuestProgress = {
  id: string
  title: string
  description: string
  badgeName: string
  landmarkIds: string[]
  completedLandmarkIds: string[]
  completed: boolean
}

export type Rank = {
  level: number
  title: string
  xp: number
  currentLevelXp: number
  nextLevelXp: number | null
}

export type ProgressUpdate = {
  xpAwarded: number
  rank: Rank
  leveledUp: boolean
  newBadges: string[]
}

export type ScanStatus = 'identified' | 'low_confidence' | 'not_nearby' | 'unrecognized'

export type ScanResult = {
  status: ScanStatus
  confidence: number
  landmark: Landmark | null
  candidates: LandmarkSummary[]
  progress: ProgressUpdate | null
}

export type ChatMessage = { role: 'user' | 'model'; content: string }

export type Profile = {
  id: string
  displayName: string
  avatarUrl: string | null
  nationality: string | null
  bio: string | null
  language: 'en' | 'ceb'
  xp: number
  streakCount: number
  lastActiveDate: string | null
}

export type ProfileUpdate = Partial<Pick<Profile, 'displayName' | 'avatarUrl' | 'nationality' | 'bio' | 'language'>>

export type Visit = {
  id: string
  userId: string
  landmarkId: string
  source: 'scan' | 'chat' | 'manual'
  xpAwarded: number
  createdAt: string
}

export type Me = {
  profile: Profile
  email: string | null
  rank: Rank
  stats: { visitedCount: number; districtCoveragePercent: number; streakCount: number }
  badges: { questId: string; name: string }[]
  recentVisits: Visit[]
}

export type LandmarkQuery = {
  q?: string
  category?: LandmarkCategory
  free?: boolean
  lat?: number
  lng?: number
  radiusKm?: number
  limit?: number
}
