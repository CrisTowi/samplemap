import axios from 'axios'
import { useGraphStore } from '../store/graphStore'
import type { Track, TrackMeta } from '../types'

// In dev, Vite proxies /genius-api → https://api.genius.com (avoids CORS).
// In production, this needs a serverless function or similar proxy.
const BASE_URL = '/genius-api'

function getApiKey(): string {
  return import.meta.env.VITE_GENIUS_KEY ?? ''
}

// ─── Response types ──────────────────────────────────────────────────────────

interface GeniusArtist {
  name: string
}

interface GeniusSong {
  id: number
  title: string
  primary_artist: GeniusArtist
  release_date_for_display?: string
  album?: { name: string }
  song_art_image_thumbnail_url?: string
}

interface GeniusSongRelationship {
  relationship_type: 'samples' | 'sampled_in' | 'interpolates' | 'interpolated_by' | 'cover_of' | 'covered_by'
  songs: GeniusSong[]
}

interface GeniusMedia {
  provider: 'youtube' | 'spotify' | 'soundcloud' | string
  url: string
}

interface GeniusSongFull extends GeniusSong {
  url: string
  description?: { plain: string }
  song_relationships: GeniusSongRelationship[]
  producer_artists?: GeniusArtist[]
  featured_artists?: GeniusArtist[]
  media?: GeniusMedia[]
  stats?: { pageviews?: number }
}

// Re-export the shared type so callers can import from one place
export type { TrackMeta as GeniusTrackMeta }

// ─── Mapping ─────────────────────────────────────────────────────────────────

function mapSong(song: GeniusSong): Track {
  const yearStr = song.release_date_for_display ?? ''
  const yearMatch = /\d{4}/.exec(yearStr)

  return {
    id: String(song.id),
    title: song.title,
    artist: song.primary_artist.name,
    album: song.album?.name,
    year: yearMatch ? parseInt(yearMatch[0]) : undefined,
    coverArt: song.song_art_image_thumbnail_url,
    sampleCount: { sampledIn: 0, sampledFrom: 0 },
  }
}

function extractMeta(song: GeniusSongFull, sampledIn: Track[], sampledFrom: Track[]): TrackMeta {
  const youtube = song.media?.find((mediaItem) => mediaItem.provider === 'youtube')
  const spotify = song.media?.find((mediaItem) => mediaItem.provider === 'spotify')

  const rawDescription = song.description?.plain?.trim() ?? ''
  // Keep only the first paragraph and cap at 200 chars
  const firstParagraph = rawDescription.split('\n').find((line) => line.trim().length > 0) ?? ''
  const description = firstParagraph.length > 200
    ? firstParagraph.slice(0, 200).replace(/\s+\S*$/, '') + '…'
    : firstParagraph || undefined

  return {
    geniusUrl: song.url,
    youtubeUrl: youtube?.url,
    spotifyUrl: spotify?.url,
    producers: (song.producer_artists ?? []).map((artist) => artist.name).filter(Boolean),
    featuredArtists: (song.featured_artists ?? []).map((artist) => artist.name).filter(Boolean),
    description,
    pageviews: song.stats?.pageviews,
    sampleCount: { sampledIn: sampledIn.length, sampledFrom: sampledFrom.length },
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function searchGenius(query: string): Promise<Track[]> {
  const store = useGraphStore.getState()
  const cacheKey = query.toLowerCase().trim()

  const cached = store.cache.search.get(cacheKey)
  if (cached) return cached

  const apiKey = getApiKey()
  if (!apiKey) return []

  const response = await axios.get<{
    response: { hits: { result: GeniusSong }[] }
  }>(`${BASE_URL}/search?q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  const results = response.data.response.hits
    .map((hit) => mapSong(hit.result))
    .slice(0, 10)

  store.setCacheEntry('search', cacheKey, results)
  return results
}

export async function getGeniusSampleRelationships(trackId: string): Promise<{
  sampledIn: Track[]
  sampledFrom: Track[]
  trackMeta: TrackMeta
}> {
  const store = useGraphStore.getState()

  const cached = store.cache.samples.get(trackId)
  if (cached) {
    // Reconstruct minimal meta from cached relationships (meta was already applied to node)
    return {
      ...cached,
      trackMeta: {
        sampleCount: { sampledIn: cached.sampledIn.length, sampledFrom: cached.sampledFrom.length },
      },
    }
  }

  const apiKey = getApiKey()
  if (!apiKey) return { sampledIn: [], sampledFrom: [], trackMeta: { sampleCount: { sampledIn: 0, sampledFrom: 0 } } }

  const response = await axios.get<{
    response: { song: GeniusSongFull }
  }>(`${BASE_URL}/songs/${trackId}?text_format=plain`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  const song = response.data.response.song
  const relationships = song.song_relationships ?? []

  const sampledFrom: Track[] = []
  const sampledIn: Track[] = []

  for (const rel of relationships) {
    if (rel.relationship_type === 'samples') {
      sampledFrom.push(...rel.songs.map(mapSong))
    } else if (rel.relationship_type === 'sampled_in') {
      sampledIn.push(...rel.songs.map(mapSong))
    }
  }

  store.setCacheEntry('samples', trackId, { sampledIn, sampledFrom })
  return { sampledIn, sampledFrom, trackMeta: extractMeta(song, sampledIn, sampledFrom) }
}
