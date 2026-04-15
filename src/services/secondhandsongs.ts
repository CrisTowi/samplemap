import axios from 'axios'
import { useGraphStore } from '../store/graphStore'
import type { Track } from '../types'

// SecondHandSongs does not have a required API key — free for non-commercial use.
// It does CORS-block direct browser requests, so we route through a proxy in development.
// Attribution: data from SecondHandSongs.com (CC BY-NC 4.0)
const BASE_URL = 'https://www.secondhandsongs.com'
const CORS_PROXY = 'https://corsproxy.io/?'

function withProxy(url: string): string {
  return `${CORS_PROXY}${encodeURIComponent(url)}`
}

// ─── Response types ──────────────────────────────────────────────────────────

interface SHSPerformance {
  uri: string          // e.g. "https://www.secondhandsongs.com/performance/123"
  title: string
  performer: {
    uri: string
    commonName: string
  }
  date?: string        // "YYYY" or "YYYY-MM-DD"
  release?: {
    title: string
    uri: string
  }
  image?: string
}

interface SHSWork {
  uri: string
  title: string
  performer?: {
    uri: string
    commonName: string
  }
  date?: string
  originals?: SHSPerformance[]
  versions?: SHSPerformance[]
  image?: string
}

interface SHSSearchResponse {
  resultCount: number
  result: Array<{
    uri: string
    entityType: 'performance' | 'work' | 'artist' | string
    commonName?: string   // for artists
    title?: string        // for works/performances
    performer?: { commonName: string }
  }>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractId(uri: string): string {
  // e.g. "https://www.secondhandsongs.com/performance/12345" → "performance-12345"
  const match = /\/(performance|work|artist)\/(\d+)/.exec(uri)
  if (!match) return uri
  return `shs-${match[1]}-${match[2]}`
}

function parseYear(dateStr?: string): number | undefined {
  if (!dateStr) return undefined
  const match = /(\d{4})/.exec(dateStr)
  return match ? parseInt(match[1]) : undefined
}

function mapPerformance(perf: SHSPerformance): Track {
  return {
    id: extractId(perf.uri),
    title: perf.title,
    artist: perf.performer?.commonName ?? 'Unknown Artist',
    album: perf.release?.title,
    year: parseYear(perf.date),
    coverArt: perf.image,
    sampleCount: { sampledIn: 0, sampledFrom: 0 },
  }
}

function mapWork(work: SHSWork): Track {
  return {
    id: extractId(work.uri),
    title: work.title,
    artist: work.performer?.commonName ?? 'Unknown Artist',
    year: parseYear(work.date),
    coverArt: work.image,
    sampleCount: { sampledIn: 0, sampledFrom: 0 },
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function searchSHS(query: string): Promise<Track[]> {
  const store = useGraphStore.getState()
  const cacheKey = query.toLowerCase().trim()

  const cached = store.cache.search.get(cacheKey)
  if (cached) return cached

  const url = `${BASE_URL}/api/search?q=${encodeURIComponent(query)}&format=json`

  const response = await axios.get<SHSSearchResponse>(withProxy(url))

  const results: Track[] = (response.data.result ?? [])
    .filter((item) => item.entityType === 'performance' || item.entityType === 'work')
    .slice(0, 10)
    .map((item) => ({
      id: extractId(item.uri),
      title: item.title ?? item.commonName ?? 'Unknown',
      artist: item.performer?.commonName ?? 'Unknown Artist',
      sampleCount: { sampledIn: 0, sampledFrom: 0 },
    }))

  store.setCacheEntry('search', cacheKey, results)
  return results
}

export async function getSHSSampleRelationships(trackId: string): Promise<{
  sampledIn: Track[]
  sampledFrom: Track[]
}> {
  const store = useGraphStore.getState()

  const cached = store.cache.samples.get(trackId)
  if (cached) return cached

  // trackId format: "shs-performance-12345" or "shs-work-12345"
  const idMatch = /^shs-(performance|work)-(\d+)$/.exec(trackId)
  if (!idMatch) return { sampledIn: [], sampledFrom: [] }

  const entityType = idMatch[1]
  const numericId = idMatch[2]

  let workId: string

  if (entityType === 'performance') {
    // Resolve the performance to get its work
    const perfUrl = `${BASE_URL}/performance/${numericId}?format=json`
    const perfResponse = await axios.get<{
      work?: { uri: string; title: string; performer?: { commonName: string }; date?: string }
    }>(withProxy(perfUrl))

    if (!perfResponse.data.work) return { sampledIn: [], sampledFrom: [] }

    const workUriMatch = /\/work\/(\d+)/.exec(perfResponse.data.work.uri)
    if (!workUriMatch) return { sampledIn: [], sampledFrom: [] }
    workId = workUriMatch[1]
  } else {
    workId = numericId
  }

  // Fetch the work with its originals and versions
  const workUrl = `${BASE_URL}/work/${workId}?format=json&fetch=originals,versions`
  const workResponse = await axios.get<SHSWork>(withProxy(workUrl))

  const work = workResponse.data

  // "versions" = other performances of this same work → treated as sampledIn (songs derived from this)
  // "originals" = what this work itself was based on → treated as sampledFrom (what this sampled)
  const sampledIn: Track[] = (work.versions ?? [])
    .filter((version) => version.uri !== `${BASE_URL}/performance/${numericId}`)
    .slice(0, 20)
    .map(mapPerformance)

  const sampledFrom: Track[] = (work.originals ?? []).slice(0, 10).map(mapPerformance)

  // If no originals, the work itself may be an original — include it as context
  if (sampledFrom.length === 0 && entityType === 'performance') {
    sampledFrom.push(mapWork(work))
  }

  const result = { sampledIn, sampledFrom }
  store.setCacheEntry('samples', trackId, result)
  return result
}
