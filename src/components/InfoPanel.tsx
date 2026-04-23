import { useState, useEffect, useRef } from 'react'
import { useGraphStore } from '../store/graphStore'
import { getPlayUrl, getVideoViewCount } from '../services/youtube'
import { buildGraphFromRoot } from '../services/graphBuilder'
import { getGeniusSampleRelationships } from '../services/genius'

const FONT_MONO = "'IBM Plex Mono', monospace"
const FONT_SANS_INTER = "'Inter', sans-serif"

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
  const isPanelMinimized = useGraphStore((state) => state.isPanelMinimized)
  const setIsPanelMinimized = useGraphStore((state) => state.setIsPanelMinimized)
  const pendingNodeId = useGraphStore((state) => state.pendingNodeId)
  const setPendingNodeId = useGraphStore((state) => state.setPendingNodeId)

  const [fallbackVideoId, setFallbackVideoId] = useState<string | null>(null)
  const [isLoadingVideo, setIsLoadingVideo] = useState(false)
  const [viewCount, setViewCount] = useState<number | null>(null)
  const [isLoadingMeta, setIsLoadingMeta] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)

  const prevSelectedNodeIdRef = useRef<string | null>(null)

  const node = selectedNodeId ? nodes.get(selectedNodeId) ?? null : null
  const pendingNode = pendingNodeId ? nodes.get(pendingNodeId) ?? null : null

  useEffect(() => {
    const prev = prevSelectedNodeIdRef.current
    prevSelectedNodeIdRef.current = selectedNodeId

    if (selectedNodeId === null) {
      setPanelOpen(false)
      setIsPanelMinimized(false)
      setPendingNodeId(null)
      return
    }

    if (prev === null) {
      let rafId: number
      rafId = requestAnimationFrame(() => {
        rafId = requestAnimationFrame(() => setPanelOpen(true))
      })
      return () => cancelAnimationFrame(rafId)
    }

    if (prev !== selectedNodeId && isPanelMinimized) {
      setIsPanelMinimized(false)
    }
  }, [selectedNodeId]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const videoId = node?.youtubeUrl ? extractVideoId(node.youtubeUrl) : fallbackVideoId

  useEffect(() => {
    if (!node) {
      setFallbackVideoId(null)
      setViewCount(null)
      return
    }
    setViewCount(null)
    if (node.youtubeUrl) {
      setFallbackVideoId(null)
      const resolvedId = extractVideoId(node.youtubeUrl)
      if (resolvedId) void getVideoViewCount(resolvedId).then(setViewCount)
      return
    }
    setFallbackVideoId(null)
    setIsLoadingVideo(true)
    void (async () => {
      try {
        const url = await getPlayUrl(node.artist, node.title)
        const resolvedId = extractVideoId(url)
        setFallbackVideoId(resolvedId)
        if (resolvedId) void getVideoViewCount(resolvedId).then(setViewCount)
      } finally {
        setIsLoadingVideo(false)
      }
    })()
  }, [node?.id, node?.youtubeUrl])

  const handleExpandFromHere = async () => {
    if (!node) return
    setSelectedNode(null)
    await buildGraphFromRoot(node)
  }

  const handleClose = () => {
    setSelectedNode(null)
    setIsPanelMinimized(false)
    setPendingNodeId(null)
  }

  const handleContinueToNew = () => {
    if (!pendingNodeId) return
    setIsPanelMinimized(false)
    setSelectedNode(pendingNodeId)
    setPendingNodeId(null)
  }

  const showVideoLoader = isLoadingVideo && !node?.youtubeUrl

  const panelTransform = !panelOpen
    ? 'translateY(100%)'
    : isPanelMinimized
      ? 'translateY(calc(100% - 56px))'
      : 'translateY(0)'

  return (
    <>
      {/* Interrupt alert — sits just above the minimized 56px strip */}
      {isPanelMinimized && pendingNode && (
        <div
          className="fixed left-0 right-0 z-[21] bg-[#fbffe5] border-t border-b border-[#1b2211] px-4 py-3 flex items-center gap-3"
          style={{ bottom: '56px' }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0 text-[#2a2d2d]">
            <path d="M8 1.5L14.5 13.5H1.5L8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <line x1="8" y1="6" x2="8" y2="9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="8" cy="11.5" r="0.7" fill="currentColor" />
          </svg>
          <p
            className="flex-1 min-w-0 text-[#2a2d2d] text-[12px] leading-[17px] tracking-[-0.24px] truncate"
            style={{ fontFamily: FONT_MONO }}
          >
            Opening <span className="font-medium">{pendingNode.title}</span> will stop the current song.
          </p>
          <button
            onClick={() => setPendingNodeId(null)}
            className="text-[#676e6f] text-[12px] leading-[16px] tracking-[-0.24px] underline hover:text-[#2a2d2d] transition-colors shrink-0"
            style={{ fontFamily: FONT_MONO }}
          >
            Keep listening
          </button>
          <button
            onClick={handleContinueToNew}
            className="text-[#2a2d2d] text-[12px] leading-[16px] tracking-[-0.24px] underline font-medium hover:bg-[#f4ffc8] px-1 py-0.5 transition-colors shrink-0"
            style={{ fontFamily: FONT_MONO }}
          >
            Open track
          </button>
        </div>
      )}

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-[#1b2211] flex flex-col"
        style={{
          height: 'min(55vh, 500px)',
          transform: panelTransform,
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* ── Header bar ── */}
        <div className="h-14 flex items-center gap-3 px-4 shrink-0 border-b border-[#1b2211]">
          {isPanelMinimized ? (
            <>
              <div className="relative shrink-0">
                {node?.coverArt ? (
                  <img src={node.coverArt} alt="" className="w-8 h-8 rounded-full border border-[#1b2211] object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full border border-[#1b2211] bg-[#f0f0eb] flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#9ca4a4]">
                      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  </div>
                )}
                {videoId && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#1D9E75] rounded-full" style={{ boxShadow: '0 0 0 2px white' }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#2a2d2d] text-[13px] leading-[18px] tracking-[-0.26px] truncate" style={{ fontFamily: FONT_SANS_INTER }}>
                  {node?.title}
                </p>
                <p className="text-[#9ca4a4] text-[11px] leading-[16px] tracking-[-0.22px] truncate" style={{ fontFamily: FONT_SANS_INTER }}>
                  {node?.artist}
                </p>
              </div>
              <button
                onClick={() => setIsPanelMinimized(false)}
                className="size-8 flex items-center justify-center text-[#676e6f] hover:text-[#2a2d2d] transition-colors"
                aria-label="Expand panel"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="2,9 7,4 12,9" />
                </svg>
              </button>
              <button
                onClick={handleClose}
                className="size-8 flex items-center justify-center text-[#676e6f] hover:text-[#2a2d2d] transition-colors"
                aria-label="Close panel"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <span className="flex-1 text-[#676e6f] text-[14px] leading-[18px] tracking-[-0.28px]" style={{ fontFamily: FONT_MONO }}>
                Track info
              </span>
              <button
                onClick={() => setIsPanelMinimized(true)}
                className="size-6 flex items-center justify-center text-[#2a2d2d] hover:text-[#676e6f] transition-colors"
                aria-label="Minimize panel"
              >
                <svg width="14" height="3" viewBox="0 0 14 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <line x1="1" y1="1.5" x2="13" y2="1.5" />
                </svg>
              </button>
              <button
                onClick={handleClose}
                className="size-6 flex items-center justify-center text-[#2a2d2d] hover:text-[#676e6f] transition-colors ml-1"
                aria-label="Close panel"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* ── Two-column content area ── */}
        {node && (
          <div className="flex-1 min-h-0 flex flex-col sm:flex-row">

            {/* Left: video / art — NOT inside a scroll container so the iframe is fully clickable */}
            <div className="relative shrink-0 bg-[#f0f0eb] h-[180px] sm:h-auto sm:w-[420px]">
              {showVideoLoader ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-[#d4d6d6] border-t-[#1b2211] rounded-full animate-spin" />
                </div>
              ) : videoId ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={`${node.title} — ${node.artist}`}
                />
              ) : node.coverArt ? (
                <img
                  src={node.coverArt}
                  alt={`${node.title} cover art`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-[#d4d6d6]">
                    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /><line x1="12" y1="2" x2="12" y2="9" />
                  </svg>
                </div>
              )}
              {viewCount !== null && (
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-white/90 border border-[#e0e0de] rounded-md px-2 py-0.5 pointer-events-none">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-[#FF4444] shrink-0">
                    <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8z" />
                  </svg>
                  <span className="text-[#2a2d2d] text-[10px] font-semibold leading-none" style={{ fontFamily: FONT_MONO }}>
                    {formatViewCount(viewCount)}
                  </span>
                </div>
              )}
            </div>

            {/* Right: track metadata — scrollable */}
            <div className="flex-1 min-w-0 overflow-y-auto border-t border-[#1b2211] sm:border-t-0 sm:border-l sm:border-[#1b2211] flex flex-col">

              {/* Title / artist / meta */}
              <div className="px-4 py-3 flex flex-col gap-[2px] border-b border-[#1b2211] shrink-0">
                <h2 className="text-[#2a2d2d] text-[18px] leading-[22px] tracking-[-0.36px] truncate" style={{ fontFamily: FONT_SANS_INTER }}>
                  {node.title}
                </h2>
                <p className="text-[#676e6f] text-[14px] leading-[22px] tracking-[-0.28px] truncate" style={{ fontFamily: FONT_SANS_INTER }}>
                  {node.artist}
                </p>
                {node.featuredArtists && node.featuredArtists.length > 0 && (
                  <p className="text-[#9ca4a4] text-[13px] leading-[20px] tracking-[-0.26px] truncate" style={{ fontFamily: FONT_SANS_INTER }}>
                    feat. {node.featuredArtists.join(', ')}
                  </p>
                )}
                {(node.album || node.year) && (
                  <p className="text-[#9ca4a4] text-[13px] leading-[20px] tracking-[-0.26px] truncate mt-0.5" style={{ fontFamily: FONT_SANS_INTER }}>
                    {[node.album, node.year].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>

              {/* Sample counts */}
              <div className="px-4 py-3 flex gap-5 border-b border-[#1b2211] shrink-0">
                <div className="flex flex-col gap-0.5">
                  {isLoadingMeta
                    ? <span className="text-[#d4d6d6] text-[18px] leading-[22px]" style={{ fontFamily: FONT_SANS_INTER }}>—</span>
                    : <span className="text-[#2a2d2d] text-[18px] leading-[22px] tracking-[-0.36px]" style={{ fontFamily: FONT_SANS_INTER }}>{node.sampleCount.sampledIn.toLocaleString()}</span>
                  }
                  <span className="text-[#9ca4a4] text-[10px] leading-[14px] uppercase tracking-wider" style={{ fontFamily: FONT_MONO }}>sampled in</span>
                </div>
                <div className="w-px bg-[#1b2211]" />
                <div className="flex flex-col gap-0.5">
                  {isLoadingMeta
                    ? <span className="text-[#d4d6d6] text-[18px] leading-[22px]" style={{ fontFamily: FONT_SANS_INTER }}>—</span>
                    : <span className="text-[#2a2d2d] text-[18px] leading-[22px] tracking-[-0.36px]" style={{ fontFamily: FONT_SANS_INTER }}>{node.sampleCount.sampledFrom.toLocaleString()}</span>
                  }
                  <span className="text-[#9ca4a4] text-[10px] leading-[14px] uppercase tracking-wider" style={{ fontFamily: FONT_MONO }}>samples from</span>
                </div>
              </div>

              {/* Producers */}
              {node.producers && node.producers.length > 0 && (
                <div className="px-4 py-3 border-b border-[#1b2211] shrink-0">
                  <span className="text-[#9ca4a4] text-[10px] leading-[14px] tracking-[-0.20px] uppercase block mb-1" style={{ fontFamily: FONT_MONO }}>
                    Produced by
                  </span>
                  <p className="text-[#676e6f] text-[13px] leading-[20px] tracking-[-0.26px]" style={{ fontFamily: FONT_SANS_INTER }}>
                    {node.producers.join(', ')}
                  </p>
                </div>
              )}

              {/* Description */}
              {node.description && (
                <div className="px-4 py-3 border-b border-[#1b2211] shrink-0">
                  <p className="text-[#9ca4a4] text-[12px] leading-[18px] tracking-[-0.24px]" style={{ fontFamily: FONT_SANS_INTER }}>
                    {node.description}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="px-4 py-3 flex flex-col items-start gap-2 shrink-0 mt-auto">
                {node.geniusUrl && (
                  <a
                    href={node.geniusUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-1 py-1 font-normal text-[#2a2d2d] text-[13px] leading-[18px] tracking-[-0.26px] underline hover:font-medium hover:bg-[#fbffe5] active:bg-[#f4ffc8] transition-colors cursor-yellow-circle"
                    style={{ fontFamily: FONT_MONO }}
                  >
                    Read on Genius
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                      <path d="M2 12L12 2M12 2H5M12 2V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                )}
                <button
                  onClick={handleExpandFromHere}
                  className="flex items-center px-1 py-1 font-normal text-[#2a2d2d] text-[13px] leading-[18px] tracking-[-0.26px] underline hover:font-medium hover:bg-[#fbffe5] active:bg-[#f4ffc8] transition-colors cursor-yellow-circle"
                  style={{ fontFamily: FONT_MONO }}
                >
                  Expand from here
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </>
  )
}
