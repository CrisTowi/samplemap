import { useState, useRef, useEffect } from 'react'
import { useGraphStore } from '../store/graphStore'
import { search } from '../services/whosampled'
import { buildGraphFromRoot } from '../services/graphBuilder'
import { resolveVideoTitle } from '../services/youtube'
import { getTrackById } from '../services/spotify'
import type { Track } from '../types'

const YOUTUBE_URL_RE = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/
const SPOTIFY_URL_RE = /spotify\.com\/track\/([A-Za-z0-9]+)/

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Track[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const maxDepth = useGraphStore((state) => state.graph.maxDepth)
  const addToast = useGraphStore((state) => state.addToast)

  const handleSelect = async (track: Track) => {
    setQuery(`${track.artist} – ${track.title}`)
    setIsOpen(false)
    setResults([])
    await buildGraphFromRoot(track, maxDepth)
  }

  const resolveAndSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const tracks = await search(searchQuery.trim())
      if (tracks.length === 1) {
        // Single confident match — auto-select
        await handleSelect(tracks[0])
      } else if (tracks.length > 1) {
        setResults(tracks)
        setIsOpen(true)
      } else {
        addToast(`No results found for "${searchQuery}"`)
      }
    } finally {
      setIsSearching(false)
    }
  }

  const handlePaste = async (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text')

    const youtubeMatch = YOUTUBE_URL_RE.exec(pasted)
    if (youtubeMatch) {
      event.preventDefault()
      setQuery(pasted)
      setIsResolving(true)
      try {
        const parsed = await resolveVideoTitle(youtubeMatch[1])
        if (!parsed) {
          addToast('Could not resolve YouTube video. Add a YouTube API key in settings.')
          return
        }
        const searchQuery = parsed.artist ? `${parsed.artist} ${parsed.song}` : parsed.song
        setQuery(searchQuery)
        await resolveAndSearch(searchQuery)
      } finally {
        setIsResolving(false)
      }
      return
    }

    const spotifyMatch = SPOTIFY_URL_RE.exec(pasted)
    if (spotifyMatch) {
      event.preventDefault()
      setQuery(pasted)
      setIsResolving(true)
      try {
        const track = await getTrackById(spotifyMatch[1])
        if (!track) {
          addToast('Could not resolve Spotify track. Add Spotify credentials in settings.')
          return
        }
        const searchQuery = `${track.artist} ${track.name}`
        setQuery(searchQuery)
        await resolveAndSearch(searchQuery)
      } finally {
        setIsResolving(false)
      }
      return
    }
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setQuery(value)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!value.trim()) {
      setResults([])
      setIsOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const tracks = await search(value.trim())
        setResults(tracks)
        setIsOpen(tracks.length > 0)
      } finally {
        setIsSearching(false)
      }
    }, 400)
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isLoading = isSearching || isResolving

  return (
    <div ref={wrapperRef} className="flex-1 max-w-xl relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onPaste={handlePaste}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search a song, artist, or paste a YouTube / Spotify URL…"
          className="w-full px-4 py-2 rounded-lg bg-white/10 text-white placeholder-white/30 text-sm border border-white/10 focus:outline-none focus:border-[#7F77DD]/60 focus:bg-white/15 transition-colors"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul className="absolute top-full mt-1 left-0 right-0 z-50 bg-[#2a2a30] border border-white/10 rounded-lg overflow-hidden shadow-xl">
          {results.map((track) => (
            <li key={track.id}>
              <button
                onClick={() => handleSelect(track)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-colors"
              >
                {track.coverArt && (
                  <img src={track.coverArt} alt="" className="w-9 h-9 rounded object-cover shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-white text-sm font-medium truncate">{track.title}</div>
                  <div className="text-white/50 text-xs truncate">
                    {track.artist}{track.year ? ` · ${track.year}` : ''}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
