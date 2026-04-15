import axios from 'axios'
import { useGraphStore } from '../store/graphStore'

const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const API_URL = 'https://api.spotify.com/v1'

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? ''
const SPOTIFY_CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET ?? ''

// In-memory token cache (not persisted — short-lived)
let cachedToken: { value: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string | null> {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) return null

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value
  }

  try {
    const credentials = btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)
    const response = await axios.post<{ access_token: string; expires_in: number }>(
      TOKEN_URL,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    cachedToken = {
      value: response.data.access_token,
      expiresAt: Date.now() + (response.data.expires_in - 60) * 1000,
    }

    return cachedToken.value
  } catch {
    return null
  }
}

export async function getTrackUrl(artist: string, title: string): Promise<string | null> {
  const store = useGraphStore.getState()
  const cacheKey = `${artist.toLowerCase()}:${title.toLowerCase()}`

  const cached = store.cache.spotify.get(cacheKey)
  if (cached !== undefined) return cached

  const token = await getAccessToken()
  if (!token) return null

  try {
    const response = await axios.get<{
      tracks: { items: { external_urls: { spotify: string } }[] }
    }>(`${API_URL}/search`, {
      params: { q: `${artist} ${title}`, type: 'track', limit: 1 },
      headers: { Authorization: `Bearer ${token}` },
    })

    const url = response.data.tracks.items[0]?.external_urls?.spotify ?? null
    store.setCacheEntry('spotify', cacheKey, url)
    return url
  } catch (error: unknown) {
    const status = (error as { response?: { status: number } })?.response?.status
    if (status === 401) {
      cachedToken = null
      const freshToken = await getAccessToken()
      if (!freshToken) return null

      try {
        const retryResponse = await axios.get<{
          tracks: { items: { external_urls: { spotify: string } }[] }
        }>(`${API_URL}/search`, {
          params: { q: `${artist} ${title}`, type: 'track', limit: 1 },
          headers: { Authorization: `Bearer ${freshToken}` },
        })

        const url = retryResponse.data.tracks.items[0]?.external_urls?.spotify ?? null
        store.setCacheEntry('spotify', cacheKey, url)
        return url
      } catch {
        return null
      }
    }

    store.setCacheEntry('spotify', cacheKey, null)
    return null
  }
}

export async function getTrackById(trackId: string): Promise<{
  name: string
  artist: string
  album: string
  year: string
  coverArt: string
} | null> {
  const token = await getAccessToken()
  if (!token) return null

  try {
    const response = await axios.get<{
      name: string
      artists: { name: string }[]
      album: { name: string; release_date: string; images: { url: string }[] }
    }>(`${API_URL}/tracks/${trackId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = response.data
    return {
      name: data.name,
      artist: data.artists[0]?.name ?? '',
      album: data.album.name,
      year: data.album.release_date?.slice(0, 4) ?? '',
      coverArt: data.album.images[0]?.url ?? '',
    }
  } catch {
    return null
  }
}
