import axios from 'axios'
import { useGraphStore } from '../store/graphStore'
import { MOCK_SEARCH_RESULTS, MOCK_SAMPLE_RELATIONSHIPS } from '../mocks/whosampled'
import type { Track } from '../types'

const BASE_URL = 'https://api.whosampled.com/v1'
const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true'

function getApiKey(): string {
  return useGraphStore.getState().apiKeys.whosampled
}

function mapTrack(raw: {
  id: string
  name: string
  artist: { name: string }
  album?: string
  year?: number
  image?: string
  sampled_count?: number
  sampled_in_count?: number
}): Track {
  return {
    id: raw.id,
    title: raw.name,
    artist: raw.artist.name,
    album: raw.album,
    year: raw.year,
    coverArt: raw.image,
    sampleCount: {
      sampledIn: raw.sampled_in_count ?? 0,
      sampledFrom: raw.sampled_count ?? 0,
    },
  }
}

export async function search(query: string): Promise<Track[]> {
  const store = useGraphStore.getState()
  const cacheKey = query.toLowerCase().trim()

  const cached = store.cache.search.get(cacheKey)
  if (cached) return cached

  if (USE_MOCK) {
    const results = MOCK_SEARCH_RESULTS[cacheKey] ?? []
    store.setCacheEntry('search', cacheKey, results)
    return results
  }

  const apiKey = getApiKey()
  const response = await axios.get<{ results: Parameters<typeof mapTrack>[0][] }>(
    `${BASE_URL}/track/search/`,
    {
      params: { q: query, format: 'json' },
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  )

  const results = response.data.results.map(mapTrack)
  store.setCacheEntry('search', cacheKey, results)
  return results
}

export async function getSampleRelationships(trackId: string): Promise<{
  sampledIn: Track[]
  sampledFrom: Track[]
}> {
  const store = useGraphStore.getState()
  const cached = store.cache.samples.get(trackId)
  if (cached) return cached

  if (USE_MOCK) {
    const result = MOCK_SAMPLE_RELATIONSHIPS[trackId] ?? { sampledIn: [], sampledFrom: [] }
    store.setCacheEntry('samples', trackId, result)
    return result
  }

  const apiKey = getApiKey()
  const headers = { Authorization: `Bearer ${apiKey}` }

  const [containsResponse, sampledInResponse] = await Promise.all([
    axios.get<{ results: Parameters<typeof mapTrack>[0][] }>(
      `${BASE_URL}/track/${trackId}/contains/`,
      { headers }
    ),
    axios.get<{ results: Parameters<typeof mapTrack>[0][] }>(
      `${BASE_URL}/track/${trackId}/sampled-in/`,
      { headers }
    ),
  ])

  const result = {
    sampledFrom: containsResponse.data.results.map(mapTrack),
    sampledIn: sampledInResponse.data.results.map(mapTrack),
  }

  store.setCacheEntry('samples', trackId, result)
  return result
}
