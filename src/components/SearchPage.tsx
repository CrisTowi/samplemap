import { useState, useRef } from 'react'
import { useGraphStore } from '../store/graphStore'
import { search } from '../services/whosampled'
import { resolveVideoTitle } from '../services/youtube'
import { getTrackById } from '../services/spotify'
import type { Track } from '../types'

const YOUTUBE_URL_RE = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/
const SPOTIFY_URL_RE = /spotify\.com\/track\/([A-Za-z0-9]+)/
const MAX_VISIBLE_RESULTS = 5

const FONT_MONO = "'IBM Plex Mono', monospace"
const FONT_SANS_RETHINK = "'Rethink Sans', sans-serif"
const FONT_SANS_INTER = "'Inter', sans-serif"

type SearchState = 'idle' | 'searching' | 'results'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [searchState, setSearchState] = useState<SearchState>('idle')
  const [results, setResults] = useState<Track[]>([])
  const [showAll, setShowAll] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const setPreviewTrack = useGraphStore((state) => state.setPreviewTrack)
  const addToast = useGraphStore((state) => state.addToast)

  const handleSelect = (track: Track) => {
    setResults([])
    setSearchState('idle')
    setPreviewTrack(track)
  }

  const runSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return
    setSearchState('searching')
    setResults([])
    setShowAll(false)
    try {
      const tracks = await search(searchQuery.trim())
      if (tracks.length === 0) {
        addToast(`No results for "${searchQuery}"`)
        setSearchState('idle')
      } else if (tracks.length === 1) {
        await handleSelect(tracks[0])
      } else {
        setResults(tracks)
        setSearchState('results')
      }
    } catch {
      setSearchState('idle')
    }
  }

  const handlePaste = async (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text')

    const youtubeMatch = YOUTUBE_URL_RE.exec(pasted)
    if (youtubeMatch) {
      event.preventDefault()
      setQuery(pasted)
      setIsResolving(true)
      setSearchState('searching')
      try {
        const parsed = await resolveVideoTitle(youtubeMatch[1])
        if (!parsed) {
          addToast('Could not resolve YouTube video. Add a YouTube API key in settings.')
          setSearchState('idle')
          return
        }
        const resolvedQuery = parsed.artist ? `${parsed.artist} ${parsed.song}` : parsed.song
        setQuery(resolvedQuery)
        await runSearch(resolvedQuery)
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
      setSearchState('searching')
      try {
        const track = await getTrackById(spotifyMatch[1])
        if (!track) {
          addToast('Could not resolve Spotify track. Add Spotify credentials in settings.')
          setSearchState('idle')
          return
        }
        const resolvedQuery = `${track.artist} ${track.name}`
        setQuery(resolvedQuery)
        await runSearch(resolvedQuery)
      } finally {
        setIsResolving(false)
      }
      return
    }
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setQuery(value)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!value.trim()) {
      setResults([])
      setSearchState('idle')
      return
    }

    setSearchState('searching')
    debounceRef.current = setTimeout(() => {
      void runSearch(value.trim())
    }, 400)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && query.trim()) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      void runSearch(query.trim())
    }
  }

  const visibleResults = showAll ? results : results.slice(0, MAX_VISIBLE_RESULTS)
  const hiddenCount = results.length - MAX_VISIBLE_RESULTS
  const isLoading = searchState === 'searching' || isResolving

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: '#ffffff' }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* ─── Logo ─────────────────────────────────────────────────────────── */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-none">
        {/* Three circles decreasing left→right: r=6.5, r=5.5, r=4.5 */}
        <svg width="43" height="13" viewBox="0 0 43 13" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="6.5" cy="6.5" r="6.5" fill="#1B2211" />
          <circle cx="23.5" cy="6.5" r="5.5" fill="#1B2211" />
          <circle cx="38.5" cy="6.5" r="4.5" fill="#1B2211" />
        </svg>
        <span
          className="text-[14px] leading-[22px] text-[#2a2d2d] tracking-[-0.28px]"
          style={{ fontFamily: FONT_MONO }}
        >
          Node Record
        </span>
      </div>

      {/* ─── Search input — 36px above the divider line ───────────────────── */}
      <div
        className="absolute left-0 right-0 flex justify-center px-6"
        style={{ top: 'calc(50% - 181px)' }}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          autoFocus
          placeholder="Search song"
          className="search-input w-full max-w-[600px] text-center bg-transparent border-none outline-none"
          style={{
            fontFamily: FONT_SANS_RETHINK,
            fontSize: '18px',
            fontWeight: 400,
            lineHeight: '22px',
            letterSpacing: '-0.36px',
            color: '#2a2d2d',
            caretColor: '#2a2d2d',
          }}
        />
      </div>

      {/* ─── Full-width divider ────────────────────────────────────────────── */}
      <div
        className="absolute left-0 right-0 h-px bg-[#1b2211]"
        style={{ top: 'calc(50% - 145px)' }}
      />

      {/* ─── Status line — 12px below divider ─────────────────────────────── */}
      <div
        className="absolute left-0 right-0 flex justify-center"
        style={{ top: 'calc(50% - 133px)' }}
      >
        {searchState === 'idle' && !isResolving && (
          <span
            className="text-[14px] leading-[22px] text-[#2a2d2d] tracking-[-0.28px]"
            style={{ fontFamily: FONT_MONO }}
          >
            find the node
          </span>
        )}
        {isLoading && (
          <span
            className="text-[14px] leading-[18px] text-[#9ca4a4] tracking-[-0.28px]"
            style={{ fontFamily: FONT_MONO }}
          >
            searching...
          </span>
        )}
        {searchState === 'results' && !isLoading && (
          <span
            className="text-[14px] leading-[18px] text-[#9ca4a4] tracking-[-0.28px]"
            style={{ fontFamily: FONT_MONO }}
          >
            {results.length} nodes
          </span>
        )}
      </div>

      {/* ─── Pulsing dot — searching state only ───────────────────────────── */}
      {isLoading && (
        <div
          className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#1b2211] animate-pulse-dot"
          style={{ top: 'calc(50% + 94px)' }}
        />
      )}

      {/* ─── Results list — 102px below divider ───────────────────────────── */}
      {searchState === 'results' && !isLoading && visibleResults.length > 0 && (
        <div
          className="absolute left-1/2 -translate-x-1/2 w-[345px] flex flex-col gap-[8px]"
          style={{ top: 'calc(50% - 43px)' }}
        >
          {visibleResults.map((track) => (
            <button
              key={track.id}
              onClick={(event) => { event.stopPropagation(); void handleSelect(track) }}
              className="w-full text-left group"
            >
              <div className="flex items-center gap-[8px] pt-[4px] px-[8px] pb-[4px] group-hover:bg-[#fbffe5] transition-colors">
                {/* Album art — circular with border */}
                <div className="shrink-0 size-[42px] rounded-full overflow-hidden border border-[#1b2211] relative">
                  {track.coverArt ? (
                    <img
                      src={track.coverArt}
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : (
                    <div className="size-full bg-[#fbffe5] flex items-center justify-center">
                      <svg width="50%" height="50%" viewBox="0 0 24 24" fill="none" stroke="#9ca4a4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18V5l12-2v13" />
                        <circle cx="6" cy="18" r="3" />
                        <circle cx="18" cy="16" r="3" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Track info */}
                <div className="flex flex-1 flex-col gap-[2px] min-w-0 justify-center">
                  <span
                    className="text-[#2a2d2d] truncate text-[18px] leading-[22px] tracking-[-0.36px]"
                    style={{ fontFamily: FONT_SANS_INTER }}
                  >
                    {track.title}
                  </span>
                  <span
                    className="text-[#676e6f] truncate text-[14px] leading-[22px] tracking-[-0.28px]"
                    style={{ fontFamily: FONT_SANS_INTER }}
                  >
                    {track.artist}
                  </span>
                </div>

                {/* Year */}
                {track.year && (
                  <span
                    className="shrink-0 text-[#676e6f] text-[14px] leading-[22px] tracking-[-0.28px]"
                    style={{ fontFamily: FONT_SANS_INTER }}
                  >
                    {track.year}
                  </span>
                )}
              </div>

              {/* Row divider */}
              <div className="w-full h-px bg-[#1b2211]" />
            </button>
          ))}

          {/* See Results — Active / Hover / Pressed states from Figma */}
          {!showAll && hiddenCount > 0 && (
            <div className="flex justify-center mt-6">
              <button
                onClick={(event) => { event.stopPropagation(); setShowAll(true) }}
                className={[
                  // layout
                  'flex items-center justify-center px-2 py-1',
                  // Active state: Regular 400, no bg
                  'font-normal text-[#2a2d2d] text-[16px] leading-[18px] tracking-[-0.32px] underline decoration-solid',
                  // Hover state: Medium 500, Background/Neutral/Cool
                  'hover:font-medium hover:bg-[#fbffe5]',
                  // Pressed state: Medium 500, Background/Accents/Joy
                  'active:font-medium active:bg-[#f4ffc8]',
                  'transition-colors',
                ].join(' ')}
                style={{ fontFamily: FONT_MONO }}
              >
                See Results
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Footer ───────────────────────────────────────────────────────── */}
      <div className="absolute bottom-[52px] left-1/2 -translate-x-1/2 pointer-events-none">
        <span
          className="text-[16px] leading-[20px] text-[#2a2d2d] tracking-[-0.32px] whitespace-nowrap"
          style={{ fontFamily: FONT_MONO }}
        >
          2026, Powered by Lucila and Christian
        </span>
      </div>
    </div>
  )
}
