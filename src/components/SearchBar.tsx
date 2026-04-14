import { useState, useRef, useEffect } from 'react'
import { useGraphStore } from '../store/graphStore'
import { search } from '../services/whosampled'
import { buildGraphFromRoot } from '../services/graphBuilder'
import type { Track } from '../types'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Track[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const apiKeys = useGraphStore((state) => state.apiKeys)
  const toggleSettings = useGraphStore((state) => state.toggleSettings)
  const maxDepth = useGraphStore((state) => state.graph.maxDepth)

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
      if (!apiKeys.whosampled && import.meta.env.VITE_USE_MOCK_DATA !== 'true') {
        return
      }
      setIsLoading(true)
      try {
        const tracks = await search(value.trim())
        setResults(tracks)
        setIsOpen(tracks.length > 0)
      } finally {
        setIsLoading(false)
      }
    }, 400)
  }

  const handleSelect = async (track: Track) => {
    setQuery(`${track.artist} – ${track.title}`)
    setIsOpen(false)
    setResults([])
    await buildGraphFromRoot(track, maxDepth)
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

  const missingKey = !apiKeys.whosampled && import.meta.env.VITE_USE_MOCK_DATA !== 'true'

  return (
    <div ref={wrapperRef} className="flex-1 max-w-xl relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={missingKey ? 'Add WhoSampled API key in settings…' : 'Search a song or artist…'}
          className="w-full px-4 py-2 rounded-lg bg-white/10 text-white placeholder-white/30 text-sm border border-white/10 focus:outline-none focus:border-[#7F77DD]/60 focus:bg-white/15 transition-colors"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {missingKey && query.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-[#2a2a30] border border-yellow-500/40 rounded-lg px-4 py-3 text-sm text-yellow-300">
          WhoSampled API key required.{' '}
          <button onClick={toggleSettings} className="underline hover:text-yellow-100">
            Open settings
          </button>
        </div>
      )}

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
