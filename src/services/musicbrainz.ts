import axios from 'axios'
import { useGraphStore } from '../store/graphStore'
import type { Track } from '../types'

const BASE_URL = 'https://musicbrainz.org/ws/2'
// MusicBrainz requires a descriptive User-Agent or requests get blocked
const USER_AGENT = 'NodeRecord/1.0.0 (https://github.com/CrisTowi/samplemap)'

// ─── Rate limiter ────────────────────────────────────────────────────────────
// MusicBrainz allows max 1 unauthenticated request/second.
// We queue requests through this to stay compliant.

let lastRequestAt = 0

async function mbRequest<T>(fn: () => Promise<T>): Promise<T> {
  const elapsed = Date.now() - lastRequestAt
  if (elapsed < 1100) {
    await delay(1100 - elapsed)
  }
  lastRequestAt = Date.now()
  return fn()
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── MusicBrainz response types ──────────────────────────────────────────────

interface MBArtistCredit {
  artist: { name: string }
}

interface MBRelease {
  id: string
  title: string
  date?: string
}

interface MBRecording {
  id: string
  title: string
  'artist-credit': MBArtistCredit[]
  releases?: MBRelease[]
}

interface MBRelation {
  type: string
  direction: 'forward' | 'backward'
  recording?: MBRecording
}

// ─── Mapping ─────────────────────────────────────────────────────────────────

function mapRecording(recording: MBRecording): Track {
  const artist = recording['artist-credit']?.[0]?.artist?.name ?? 'Unknown Artist'
  const release = recording.releases?.[0]
  const year = release?.date ? parseInt(release.date.slice(0, 4)) : undefined

  return {
    id: recording.id,
    title: recording.title,
    artist,
    album: release?.title,
    year,
    // Cover Art Archive — returns 404 gracefully if no art exists
    coverArt: release?.id
      ? `https://coverartarchive.org/release/${release.id}/front-250`
      : undefined,
    sampleCount: { sampledIn: 0, sampledFrom: 0 },
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function searchMusicBrainz(query: string): Promise<Track[]> {
  const store = useGraphStore.getState()
  const cacheKey = query.toLowerCase().trim()

  const cached = store.cache.search.get(cacheKey)
  if (cached) return cached

  const response = await mbRequest(() =>
    axios.get<{ recordings: MBRecording[] }>(`${BASE_URL}/recording`, {
      params: { query, fmt: 'json', limit: 10 },
      headers: { 'User-Agent': USER_AGENT },
    })
  )

  const results = (response.data.recordings ?? []).map(mapRecording)
  store.setCacheEntry('search', cacheKey, results)
  return results
}

export async function getMBSampleRelationships(trackId: string): Promise<{
  sampledIn: Track[]
  sampledFrom: Track[]
}> {
  const store = useGraphStore.getState()

  const cached = store.cache.samples.get(trackId)
  if (cached) return cached

  const response = await mbRequest(() =>
    axios.get<{ relations: MBRelation[] }>(`${BASE_URL}/recording/${trackId}`, {
      params: { inc: 'recording-rels+artist-credits+releases', fmt: 'json' },
      headers: { 'User-Agent': USER_AGENT },
    })
  )

  const relations = response.data.relations ?? []
  const sampledFrom: Track[] = []
  const sampledIn: Track[] = []

  for (const relation of relations) {
    if (relation.type === 'samples material' && relation.recording) {
      // forward:  this recording samples FROM relation.recording
      // backward: relation.recording was sampled IN this recording
      if (relation.direction === 'forward') {
        sampledFrom.push(mapRecording(relation.recording))
      } else {
        sampledIn.push(mapRecording(relation.recording))
      }
    }
  }

  const result = { sampledIn, sampledFrom }
  store.setCacheEntry('samples', trackId, result)
  return result
}
