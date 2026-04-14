import axios from 'axios'
import { useGraphStore } from '../store/graphStore'

const BASE_URL = 'https://www.googleapis.com/youtube/v3'

export function parseYouTubeTitle(title: string): { artist: string; song: string } {
  const separators = [' - ', ' – ', ' | ']
  for (const separator of separators) {
    if (title.includes(separator)) {
      const [artist, ...rest] = title.split(separator)
      return {
        artist: artist.trim(),
        song: rest.join(separator).replace(/\s*\(.*\)$/, '').trim(),
      }
    }
  }
  return { artist: '', song: title }
}

export async function getPlayUrl(artist: string, title: string): Promise<string> {
  const store = useGraphStore.getState()
  const cacheKey = `${artist.toLowerCase()}:${title.toLowerCase()}`

  const cached = store.cache.youtube.get(cacheKey)
  if (cached !== undefined) return cached

  const fallbackUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${artist} ${title}`)}`

  const apiKey = store.apiKeys.youtube
  if (!apiKey) return fallbackUrl

  try {
    const response = await axios.get<{
      items: { id: { videoId: string } }[]
    }>(`${BASE_URL}/search`, {
      params: {
        part: 'snippet',
        q: `${artist} ${title}`,
        type: 'video',
        maxResults: 1,
        key: apiKey,
      },
    })

    const videoId = response.data.items[0]?.id?.videoId
    const url = videoId
      ? `https://www.youtube.com/watch?v=${videoId}`
      : fallbackUrl

    store.setCacheEntry('youtube', cacheKey, url)
    return url
  } catch {
    store.setCacheEntry('youtube', cacheKey, fallbackUrl)
    return fallbackUrl
  }
}

export async function resolveVideoTitle(videoId: string): Promise<{ artist: string; song: string } | null> {
  const store = useGraphStore.getState()
  const apiKey = store.apiKeys.youtube
  if (!apiKey) return null

  try {
    const response = await axios.get<{
      items: { snippet: { title: string } }[]
    }>(`${BASE_URL}/videos`, {
      params: { part: 'snippet', id: videoId, key: apiKey },
    })

    const rawTitle = response.data.items[0]?.snippet?.title
    if (!rawTitle) return null

    return parseYouTubeTitle(rawTitle)
  } catch {
    return null
  }
}
