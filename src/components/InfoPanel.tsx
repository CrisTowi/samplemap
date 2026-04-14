import { useState, useEffect } from 'react'
import { useGraphStore } from '../store/graphStore'
import { getPlayUrl } from '../services/youtube'
import { getTrackUrl } from '../services/spotify'
import { buildGraphFromRoot } from '../services/graphBuilder'

export default function InfoPanel() {
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId)
  const nodes = useGraphStore((state) => state.graph.nodes)
  const apiKeys = useGraphStore((state) => state.apiKeys)
  const setSelectedNode = useGraphStore((state) => state.setSelectedNode)
  const maxDepth = useGraphStore((state) => state.graph.maxDepth)

  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null)
  const [spotifyUrl, setSpotifyUrl] = useState<string | null>(null)
  const [isLoadingLinks, setIsLoadingLinks] = useState(false)

  const node = selectedNodeId ? nodes.get(selectedNodeId) : null

  useEffect(() => {
    if (!node) {
      setYoutubeUrl(null)
      setSpotifyUrl(null)
      return
    }

    setYoutubeUrl(null)
    setSpotifyUrl(null)
    setIsLoadingLinks(true)

    void (async () => {
      try {
        const [ytUrl, spUrl] = await Promise.all([
          getPlayUrl(node.artist, node.title),
          apiKeys.spotifyClientId && apiKeys.spotifyClientSecret
            ? getTrackUrl(node.artist, node.title)
            : Promise.resolve(null),
        ])
        setYoutubeUrl(ytUrl || null)
        setSpotifyUrl(spUrl)
      } finally {
        setIsLoadingLinks(false)
      }
    })()
  }, [node, apiKeys.spotifyClientId, apiKeys.spotifyClientSecret])

  const handleExpandFromHere = async () => {
    if (!node) return
    setSelectedNode(null)
    await buildGraphFromRoot(node, maxDepth)
  }

  if (!node) return null

  return (
    <div className="w-72 sm:h-full flex flex-col bg-[#1a1a20]/90 sm:backdrop-blur-md sm:border-l border-white/10 overflow-y-auto">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <span className="text-white/40 text-xs font-semibold uppercase tracking-widest">Track info</span>
        <button
          onClick={() => setSelectedNode(null)}
          className="p-1 rounded text-white/30 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close panel"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Cover art */}
      <div className="shrink-0 aspect-square w-full bg-white/5 relative overflow-hidden">
        {node.coverArt ? (
          <img
            src={node.coverArt}
            alt={`${node.title} cover art`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/10">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
              <line x1="12" y1="2" x2="12" y2="9" />
            </svg>
          </div>
        )}
      </div>

      {/* Track metadata */}
      <div className="px-4 py-4 flex flex-col gap-1 border-b border-white/10 shrink-0">
        <h2 className="text-white font-semibold text-base leading-snug">{node.title}</h2>
        <p className="text-white/60 text-sm">{node.artist}</p>
        {(node.album || node.year) && (
          <p className="text-white/35 text-xs mt-0.5">
            {[node.album, node.year].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      {/* Sample counts */}
      <div className="px-4 py-3 flex gap-4 border-b border-white/10 shrink-0">
        <div className="flex flex-col gap-0.5">
          <span className="text-[#7F77DD] text-sm font-semibold">{node.sampleCount.sampledIn.toLocaleString()}</span>
          <span className="text-white/35 text-[10px] uppercase tracking-wider">sampled in</span>
        </div>
        <div className="w-px bg-white/10" />
        <div className="flex flex-col gap-0.5">
          <span className="text-[#1D9E75] text-sm font-semibold">{node.sampleCount.sampledFrom.toLocaleString()}</span>
          <span className="text-white/35 text-[10px] uppercase tracking-wider">samples from</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 py-4 flex flex-col gap-2 shrink-0">

        {/* YouTube */}
        {isLoadingLinks ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
            <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white/50 rounded-full animate-spin shrink-0" />
            <span className="text-white/30 text-sm">Loading links…</span>
          </div>
        ) : (
          <>
            {youtubeUrl ? (
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#FF0000]/15 border border-[#FF0000]/25 text-white text-sm font-medium hover:bg-[#FF0000]/25 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[#FF4444] shrink-0">
                  <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8z" />
                  <polygon fill="#1a1a1e" points="9.75,15.02 15.5,12 9.75,8.98 9.75,15.02" />
                </svg>
                Play on YouTube
              </a>
            ) : !apiKeys.youtube ? (
              <div className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/30 text-sm">
                Add YouTube key in settings to get play links
              </div>
            ) : null}

            {spotifyUrl && (
              <a
                href={spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#1DB954]/15 border border-[#1DB954]/25 text-white text-sm font-medium hover:bg-[#1DB954]/25 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[#1DB954] shrink-0">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.28c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-.99-.12-1.11-.6-.12-.48.12-.99.6-1.11 4.38-1.32 9.78-.66 13.5 1.62.36.18.54.78.21 1.17zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z" />
                </svg>
                Open on Spotify
              </a>
            )}
          </>
        )}

        {/* Expand from here */}
        <button
          onClick={handleExpandFromHere}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#7F77DD]/15 border border-[#7F77DD]/25 text-white text-sm font-medium hover:bg-[#7F77DD]/25 transition-colors mt-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#7F77DD] shrink-0">
            <circle cx="12" cy="12" r="3" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
          Expand from here
        </button>
      </div>

    </div>
  )
}
