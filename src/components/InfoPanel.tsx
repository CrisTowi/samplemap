import { useState, useEffect } from 'react'
import { useGraphStore } from '../store/graphStore'
import { getPlayUrl, getVideoViewCount } from '../services/youtube'
import { buildGraphFromRoot } from '../services/graphBuilder'
import { getGeniusSampleRelationships } from '../services/genius'

function extractVideoId(url: string): string | null {
  const match = /[?&]v=([^&]+)/.exec(url) ?? /youtu\.be\/([^?&]+)/.exec(url)
  return match ? match[1] : null
}

function formatViewCount(count: number): string {
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B views`
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M views`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K views`
  return `${count} views`
}

export default function InfoPanel() {
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId)
  const nodes = useGraphStore((state) => state.graph.nodes)
  const setSelectedNode = useGraphStore((state) => state.setSelectedNode)
  const maxDepth = useGraphStore((state) => state.graph.maxDepth)

  const [fallbackVideoId, setFallbackVideoId] = useState<string | null>(null)
  const [isLoadingVideo, setIsLoadingVideo] = useState(false)
  const [viewCount, setViewCount] = useState<number | null>(null)
  const [isLoadingMeta, setIsLoadingMeta] = useState(false)

  const node = selectedNodeId ? nodes.get(selectedNodeId) : null

  // For unexpanded nodes (depth > 0, never fetched), load their metadata on selection
  useEffect(() => {
    if (!node || node.isExpanded) return

    setIsLoadingMeta(true)
    void (async () => {
      try {
        const { trackMeta } = await getGeniusSampleRelationships(node.id)
        useGraphStore.getState().setNodeExpanded(node.id, { ...trackMeta })
      } finally {
        setIsLoadingMeta(false)
      }
    })()
  }, [node?.id, node?.isExpanded])

  // Use Genius-provided YouTube URL if available; fall back to YouTube API search
  const videoId = node?.youtubeUrl
    ? extractVideoId(node.youtubeUrl)
    : fallbackVideoId

  useEffect(() => {
    if (!node) {
      setFallbackVideoId(null)
      setViewCount(null)
      return
    }

    setViewCount(null)

    // If Genius already gave us a YouTube URL, no need for a separate lookup
    if (node.youtubeUrl) {
      setFallbackVideoId(null)
      const resolvedId = extractVideoId(node.youtubeUrl)
      if (resolvedId) {
        void getVideoViewCount(resolvedId).then(setViewCount)
      }
      return
    }

    setFallbackVideoId(null)
    setIsLoadingVideo(true)

    void (async () => {
      try {
        const url = await getPlayUrl(node.artist, node.title)
        const resolvedId = extractVideoId(url)
        setFallbackVideoId(resolvedId)
        if (resolvedId) {
          void getVideoViewCount(resolvedId).then(setViewCount)
        }
      } finally {
        setIsLoadingVideo(false)
      }
    })()
  }, [node?.id, node?.youtubeUrl])

  const handleExpandFromHere = async () => {
    if (!node) return
    setSelectedNode(null)
    await buildGraphFromRoot(node, maxDepth)
  }

  if (!node) return null

  const showVideoLoader = isLoadingVideo && !node.youtubeUrl

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

      {/* YouTube player / cover art */}
      <div className="shrink-0 w-full bg-black relative" style={{ aspectRatio: '16/9' }}>
        {showVideoLoader ? (
          <div className="w-full h-full flex items-center justify-center bg-white/5">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white/50 rounded-full animate-spin" />
          </div>
        ) : videoId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={`${node.title} — ${node.artist}`}
          />
        ) : node.coverArt ? (
          <img
            src={node.coverArt}
            alt={`${node.title} cover art`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/5">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/10">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
              <line x1="12" y1="2" x2="12" y2="9" />
            </svg>
          </div>
        )}

        {/* View count badge */}
        {viewCount !== null && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-black/75 backdrop-blur-sm rounded-md px-2.5 py-1 pointer-events-none">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-[#FF4444] shrink-0">
              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8z"/>
            </svg>
            <span className="text-white/90 text-xs font-semibold leading-none">{formatViewCount(viewCount)}</span>
          </div>
        )}
      </div>

      {/* Track metadata */}
      <div className="px-4 py-4 flex flex-col gap-1 border-b border-white/10 shrink-0">
        <h2 className="text-white font-semibold text-base leading-snug">{node.title}</h2>
        <p className="text-white/60 text-sm">{node.artist}</p>
        {node.featuredArtists && node.featuredArtists.length > 0 && (
          <p className="text-white/40 text-xs">feat. {node.featuredArtists.join(', ')}</p>
        )}
        {(node.album || node.year) && (
          <p className="text-white/35 text-xs mt-0.5">
            {[node.album, node.year].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      {/* Description */}
      {node.description && (
        <div className="px-4 py-3 border-b border-white/10 shrink-0">
          <p className="text-white/40 text-xs leading-relaxed">{node.description}</p>
        </div>
      )}

      {/* Producers */}
      {node.producers && node.producers.length > 0 && (
        <div className="px-4 py-3 border-b border-white/10 shrink-0">
          <span className="text-white/25 text-[10px] uppercase tracking-wider block mb-1">Produced by</span>
          <p className="text-white/55 text-xs">{node.producers.join(', ')}</p>
        </div>
      )}

      {/* Sample counts */}
      <div className="px-4 py-3 flex gap-4 border-b border-white/10 shrink-0">
        <div className="flex flex-col gap-0.5">
          {isLoadingMeta
            ? <span className="text-white/20 text-sm font-semibold">—</span>
            : <span className="text-[#7F77DD] text-sm font-semibold">{node.sampleCount.sampledIn.toLocaleString()}</span>
          }
          <span className="text-white/35 text-[10px] uppercase tracking-wider">sampled in</span>
        </div>
        <div className="w-px bg-white/10" />
        <div className="flex flex-col gap-0.5">
          {isLoadingMeta
            ? <span className="text-white/20 text-sm font-semibold">—</span>
            : <span className="text-[#1D9E75] text-sm font-semibold">{node.sampleCount.sampledFrom.toLocaleString()}</span>
          }
          <span className="text-white/35 text-[10px] uppercase tracking-wider">samples from</span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-4 flex flex-col gap-2 shrink-0">

        {node.geniusUrl && (
          <a
            href={node.geniusUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#FFFF64]/10 border border-[#FFFF64]/20 text-white text-sm font-medium hover:bg-[#FFFF64]/20 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-[#FFFF64] shrink-0">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            Read on Genius
          </a>
        )}

        <button
          onClick={handleExpandFromHere}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#7F77DD]/15 border border-[#7F77DD]/25 text-white text-sm font-medium hover:bg-[#7F77DD]/25 transition-colors"
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
