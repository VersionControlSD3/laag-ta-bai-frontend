import { ApiError } from './client'
import type { ChatMessage, Landmark, LandmarkQuery, LandmarkSummary, ProgressUpdate, ScanResult } from './types'

/*
 * Demo data for VITE_MOCK_API=true: lets designers, QA and Vercel previews walk through
 * Scan-to-Story and the chat without the API or an AI key. Responses follow openapi.yaml.
 *
 * Pick a scan outcome with ?mock=<outcome> on /scan:
 *   identified (default) | low | not-nearby | no-match | error | offline
 */

const LANDMARKS: Landmark[] = [
  {
    id: 'magellans-cross',
    name: "Magellan's Cross",
    category: 'monument',
    district: 'Plaza Sugbo, Cebu City',
    latitude: 10.2934,
    longitude: 123.9021,
    imageUrl: '/landmarks/magellan.jpg',
    admissionFee: 0,
    rating: 4.7,
    visitCount: 1834,
    estimatedVisitMinutes: 20,
    visitingHours: '8:00 AM - 7:00 PM',
    story: {
      about:
        "Step beneath the painted ceiling and discover the story behind one of Cebu's most enduring cultural landmarks. The cross marks where members of Magellan's expedition planted a cross in 1521.",
      significance:
        'Tradition holds that the cross was planted after the baptism of Rajah Humabon and his wife, Hara Amihan (Queen Juana), one of the earliest recorded encounters between Cebuanos and Spanish explorers.',
      architecture:
        'The cross visible today is a wooden casing said to protect the original. It stands in an octagonal kiosk built in 1834, beside the Basilica del Santo Niño.',
      trivia:
        'Look up when you visit. The ceiling mural, showing the planting of the cross, is as much a part of the experience as the cross itself.',
    },
  },
  {
    id: 'basilica-santo-nino',
    name: 'Basilica Minore del Santo Niño',
    category: 'church',
    district: 'Cebu City',
    latitude: 10.2943,
    longitude: 123.9019,
    imageUrl: '/landmarks/basilica.jpg',
    admissionFee: 0,
    rating: 4.8,
    visitCount: 2410,
    estimatedVisitMinutes: 45,
    visitingHours: '5:00 AM - 8:00 PM',
    story: {
      about:
        'Founded in 1565, the basilica is one of the oldest Roman Catholic churches in the Philippines and home of the Santo Niño de Cebu.',
      significance:
        'It keeps the image of the Child Jesus believed to have been given to Queen Juana in 1521, the focus of the yearly Sinulog festival.',
      architecture:
        'The present church, built of coral stone in the 1730s, mixes Baroque and Neoclassical details with a bell tower on the left of the facade.',
      trivia: 'Candle vendors outside dance a short prayer as they light candles for visitors.',
    },
  },
  {
    id: 'fort-san-pedro',
    name: 'Fort San Pedro',
    category: 'fort',
    district: 'Plaza Independencia, Cebu City',
    latitude: 10.2925,
    longitude: 123.9058,
    imageUrl: '/landmarks/fort.jpg',
    admissionFee: 30,
    rating: 4.5,
    visitCount: 1290,
    estimatedVisitMinutes: 60,
    visitingHours: '8:00 AM - 7:00 PM',
    story: {
      about: 'A small triangular bastion fort first built under Miguel López de Legazpi in 1565, near the old port.',
      significance: 'It guarded the city against raids and later served as barracks, a prison and a garrison under several governments.',
      architecture: 'Two sides face the sea and one faces land, with walls of coral stone and three bastions.',
      trivia: 'After the Second World War, the fort grounds were used for a time as a small zoo.',
    },
  },
  {
    id: 'heritage-of-cebu-monument',
    name: 'Heritage of Cebu Monument',
    category: 'monument',
    district: 'Parian, Cebu City',
    latitude: 10.2986,
    longitude: 123.9037,
    imageUrl: '/landmarks/heritage.jpg',
    admissionFee: 0,
    rating: 4.4,
    visitCount: 640,
    estimatedVisitMinutes: 20,
    visitingHours: 'Open 24 hours',
    story: {
      about: "A sculpture tableau in the old Parian district that tells Cebu's history in one scene.",
      significance: 'It brings together key moments, from the Battle of Mactan to the Sinulog, in a single public artwork.',
      architecture: 'Concrete, brass, bronze and steel figures rise around a central platform.',
      trivia: 'The monument was completed in 2000, and its scenes span about five centuries.',
    },
  },
  {
    id: 'casa-gorordo',
    name: 'Casa Gorordo Museum',
    category: 'heritage_house',
    district: 'Parian, Cebu City',
    latitude: 10.2992,
    longitude: 123.9044,
    imageUrl: '/landmarks/casa.jpg',
    admissionFee: 120,
    rating: 4.6,
    visitCount: 520,
    estimatedVisitMinutes: 45,
    visitingHours: '9:00 AM - 5:00 PM, closed Mondays',
    story: {
      about: 'A 19th-century house that shows how a well-off Cebuano family lived in the Spanish colonial era.',
      significance: 'It was home to the Gorordo family, including Juan Gorordo, the first Filipino bishop of Cebu.',
      architecture: 'Coral-stone walls below and a wooden upper floor with capiz-shell windows, typical of a bahay na bato.',
      trivia: 'The kitchen and the azotea are set up as they would have looked in the late 1800s.',
    },
  },
]

const summary = ({ story: _story, ...rest }: Landmark): LandmarkSummary => rest

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })

const DEMO_PROGRESS: ProgressUpdate = {
  xpAwarded: 50,
  rank: { level: 2, title: 'Wanderer', xp: 250, currentLevelXp: 200, nextLevelXp: 500 },
  leveledUp: false,
  newBadges: [],
}

function scanOutcome(): string {
  return new URLSearchParams(globalThis.location?.search ?? '').get('mock') ?? 'identified'
}

export const mockApi = {
  async listLandmarks(query: LandmarkQuery = {}) {
    await sleep(300)
    const q = query.q?.toLowerCase()
    return LANDMARKS.filter((l) => !q || l.name.toLowerCase().includes(q))
      .filter((l) => !query.category || l.category === query.category)
      .map(summary)
  },

  async getLandmark(id: string) {
    await sleep(300)
    const landmark = LANDMARKS.find((l) => l.id === id)
    if (!landmark) throw new ApiError(404, 'not_found', "We couldn't find that landmark.")
    return landmark
  },

  async scan(signal?: AbortSignal): Promise<ScanResult> {
    await sleep(2200, signal)
    const [cross, basilica, fort] = LANDMARKS
    const nearby = [basilica, cross, fort].map((l, i) => ({ ...summary(l), distanceMeters: 80 + i * 120 }))
    switch (scanOutcome()) {
      case 'low':
        return { status: 'low_confidence', confidence: 0.62, landmark: cross, candidates: nearby, progress: null }
      case 'not-nearby':
        return { status: 'not_nearby', confidence: 0.91, landmark: cross, candidates: [], progress: null }
      case 'no-match':
        return { status: 'unrecognized', confidence: 0.12, landmark: null, candidates: nearby, progress: null }
      case 'error':
        throw new ApiError(503, 'unavailable', 'The service is busy. Please try again.')
      case 'offline':
        throw new ApiError(0, 'network_error', "Can't reach the server. Check your connection and try again.")
      default:
        return { status: 'identified', confidence: 0.98, landmark: cross, candidates: nearby, progress: DEMO_PROGRESS }
    }
  },

  async chat(input: { landmarkId: string; messages: ChatMessage[] }) {
    await sleep(1200)
    const landmark = LANDMARKS.find((l) => l.id === input.landmarkId) ?? LANDMARKS[0]
    const question = input.messages.at(-1)?.content.toLowerCase() ?? ''
    return { message: { role: 'model' as const, content: demoReply(landmark, question) }, progress: null }
  },
}

function demoReply(landmark: Landmark, question: string): string {
  const { story } = landmark
  if (/near|next|around|walk/.test(question)) {
    const others = LANDMARKS.filter((l) => l.id !== landmark.id).slice(0, 3)
    return `A few places close to **${landmark.name}**:\n\n${others.map((l) => `- **${l.name}** (${l.district})`).join('\n')}`
  }
  if (/hour|open|fee|ticket|price|cost/.test(question)) {
    const fee = landmark.admissionFee === 0 ? 'free to enter' : `₱${landmark.admissionFee} to enter`
    return `${landmark.name} is open ${landmark.visitingHours} and is ${fee}. Plan about ${landmark.estimatedVisitMinutes} minutes.`
  }
  if (/why|important|significan|matter/.test(question)) return story.significance
  if (/who|when|history|plant|found/.test(question)) return story.about
  if (/built|made|look|architect|design|style/.test(question)) return story.architecture
  if (/fun|fact|trivia|legend|story|myth|secret/.test(question)) return story.trivia
  return `Good question! Here's what I know about **${landmark.name}**: ${story.about}\n\nAsk me about its history, architecture, nearby places or visiting hours.`
}
