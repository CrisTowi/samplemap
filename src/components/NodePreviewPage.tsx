import { useState, useEffect } from 'react'
import { useGraphStore } from '../store/graphStore'
import { getSampleRelationships } from '../services/whosampled'
import { buildGraphFromRoot } from '../services/graphBuilder'
import type { Track } from '../types'

const FONT_MONO = "'IBM Plex Mono', monospace"
const FONT_SANS_INTER = "'Inter', sans-serif"

// All vertical positions are derived from the connecting line anchor:
// LINE_Y = calc(50% - 145px)  [same divider y used in SearchPage]
//
// From Figma (1512×982):          offset from line
// Artist label   top=191px        line - 158px  → calc(50% - 303px)
// Main album     top=259px        line -  90px  → calc(50% - 235px)  (center at line)
// Line           top=349px        line ±   0    → calc(50% - 145px)
// Right song     top=291px        line -  58px  → calc(50% - 203px)  (bottom divider AT line)
// Label / center top=360px        line +  11px  → calc(50% - 134px)
// Root song row  top=447px        line +  98px  → calc(50% -  47px)
//
// Horizontal positions (% of 1512px):
// Main album  left=275px → 18.2%
// Artist      left=328px → 21.7%
// Root row    left=193px → 12.8%
// Right song  left=953px → 63%
// Label center calc(50% + 324.5px) with translateX(-50%)

function MusicPlaceholder() {
  return (
    <div className="size-full bg-[#fbffe5] flex items-center justify-center">
      <svg width="40%" height="40%" viewBox="0 0 24 24" fill="none" stroke="#9ca4a4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    </div>
  )
}

function ArrowUpRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 12L12 2M12 2H5M12 2V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function NodePreviewPage() {
  const rootTrack = useGraphStore((state) => state.previewTrack)!
  const setPreviewTrack = useGraphStore((state) => state.setPreviewTrack)
  const [topSample, setTopSample] = useState<Track | null>(null)
  const [previewTracks, setPreviewTracks] = useState<Track[]>([])
  const [nodeCount, setNodeCount] = useState(
    rootTrack.sampleCount.sampledIn + rootTrack.sampleCount.sampledFrom
  )
  const [isLoading, setIsLoading] = useState(true)
  const [genre, setGenre] = useState<string | undefined>(rootTrack.genre)

  useEffect(() => {
    void (async () => {
      try {
        const result = await getSampleRelationships(rootTrack.id)
        const all = [...result.sampledFrom, ...result.sampledIn].sort((trackA, trackB) => {
          const scoreA =
            (trackA.pageviews ?? 0) +
            (trackA.sampleCount.sampledIn + trackA.sampleCount.sampledFrom) * 100
          const scoreB =
            (trackB.pageviews ?? 0) +
            (trackB.sampleCount.sampledIn + trackB.sampleCount.sampledFrom) * 100
          return scoreB - scoreA
        })
        if (all.length > 0) {
          setTopSample(all[0])
          setPreviewTracks(all.slice(1, 4))
          setNodeCount(Math.max(all.length, nodeCount))
        }
        if (!genre && result.trackMeta?.genre) {
          setGenre(result.trackMeta.genre)
        }
      } finally {
        setIsLoading(false)
      }
    })()
  }, [rootTrack.id])

  const handleDiscover = async () => {
    await buildGraphFromRoot(rootTrack)
  }

  const handleNewSearch = () => {
    setPreviewTrack(null)
  }

  // Show the right-side song + connecting line while loading (we don't know yet)
  // and whenever a topSample exists. Without it, center the left-side elements.
  const showSide = isLoading || !!topSample

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-white">
    <div className="relative mx-auto max-w-[1512px] h-full">

      {/* ─── Top bar ─────────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white border-b border-[#e8e8e4]">
        <div className="flex items-center h-[72px] px-4 sm:px-[44px]">
          <div className="flex-1 flex items-center">
            <button
              onClick={handleNewSearch}
              className={[
                'flex items-center justify-center px-1',
                'font-normal text-[#2a2d2d] text-[14px] leading-[18px] tracking-[-0.28px] underline decoration-solid',
                'hover:font-medium hover:bg-[#fbffe5]',
                'active:font-medium active:bg-[#f4ffc8]',
                'transition-colors whitespace-nowrap',
              ].join(' ')}
              style={{ fontFamily: FONT_MONO }}
            >
              New search
            </button>
          </div>
          <div className="flex flex-col items-center gap-2 pointer-events-none shrink-0">
            <svg width="43" height="13" viewBox="0 0 43 13" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="6.5" cy="6.5" r="6.5" fill="#1B2211" />
              <circle cx="23.5" cy="6.5" r="5.5" fill="#1B2211" />
              <circle cx="38.5" cy="6.5" r="4.5" fill="#1B2211" />
            </svg>
            <span className="text-[14px] leading-[22px] text-[#2a2d2d] tracking-[-0.28px]" style={{ fontFamily: FONT_MONO }}>
              Node Record
            </span>
          </div>
          <div className="flex-1" />
        </div>
      </div>

      {/* ─── Mobile layout (sm:hidden) ───────────────────────────────────── */}
      {/* No skeleton, no side content — just song details centered */}
      <div className="sm:hidden flex flex-col items-center justify-center h-full gap-6 px-6 pt-[72px] pb-[52px]">
        {/* Album art */}
        <div className="rounded-full overflow-hidden border border-[#1b2211] shrink-0" style={{ width: 160, height: 160 }}>
          {rootTrack.coverArt
            ? <img src={rootTrack.coverArt} alt={rootTrack.title} className="size-full object-cover" />
            : <MusicPlaceholder />
          }
        </div>

        {/* Artist + title */}
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-[#676e6f] text-[14px] leading-[22px] tracking-[-0.28px]" style={{ fontFamily: FONT_SANS_INTER }}>
            Artist
          </span>
          <span className="text-[#2a2d2d] text-[24px] leading-[28px] tracking-[-0.48px]" style={{ fontFamily: FONT_SANS_INTER }}>
            {rootTrack.artist}
          </span>
        </div>

        {/* Song row */}
        <div className="w-full max-w-[345px] flex flex-col gap-2">
          <div className="flex items-center gap-2 pt-1 px-2">
            <div className="flex flex-1 flex-col gap-[2px] min-w-0">
              <span className="text-[#2a2d2d] text-[18px] leading-[22px] tracking-[-0.36px] truncate" style={{ fontFamily: FONT_SANS_INTER }}>
                {rootTrack.title}
              </span>
              <span className="text-[#676e6f] text-[14px] leading-[22px] tracking-[-0.28px] truncate" style={{ fontFamily: FONT_SANS_INTER }}>
                {genre ?? rootTrack.artist}
              </span>
            </div>
            {rootTrack.year && (
              <span className="shrink-0 text-[#676e6f] text-[14px] leading-[22px] tracking-[-0.28px]" style={{ fontFamily: FONT_SANS_INTER }}>
                {rootTrack.year}
              </span>
            )}
            <button
              onClick={handleDiscover}
              className="shrink-0 size-[24px] flex items-center justify-center text-[#2a2d2d] hover:text-[#676e6f] transition-colors"
              aria-label="Discover graph"
            >
              <ArrowUpRight />
            </button>
          </div>
          <div className="w-full h-px bg-[#1b2211]" />
        </div>

        {/* Discover button — only shown once loading is done */}
        {!isLoading && nodeCount > 0 && (
          <button
            onClick={handleDiscover}
            className={[
              'flex items-center justify-center px-1',
              'font-normal text-[#2a2d2d] text-[14px] leading-[18px] tracking-[-0.28px] underline decoration-solid',
              'hover:font-medium hover:bg-[#fbffe5]',
              'active:font-medium active:bg-[#f4ffc8]',
              'transition-colors',
            ].join(' ')}
            style={{ fontFamily: FONT_MONO }}
          >
            discover {nodeCount} nodes
          </button>
        )}
      </div>

      {/* ─── Desktop layout (hidden sm:block) ───────────────────────────── */}
      <div className="hidden sm:block">

        {/* Artist label — centered above the album circle */}
        <div
          className="absolute -translate-x-1/2 flex flex-col items-center"
          style={{
            left: showSide ? 'calc(18.2% + 90px)' : '50%',
            top: 'calc(50% - 303px)',
          }}
        >
          <span className="text-[#676e6f] text-[14px] leading-[22px] tracking-[-0.28px]" style={{ fontFamily: FONT_SANS_INTER }}>
            Artist
          </span>
          <span className="text-[#2a2d2d] text-[24px] leading-[28px] tracking-[-0.48px] text-center whitespace-nowrap" style={{ fontFamily: FONT_SANS_INTER }}>
            {rootTrack.artist}
          </span>
        </div>

        {/* Main album  180×180px circle */}
        <div
          className={`absolute rounded-full overflow-hidden border border-[#1b2211]${showSide ? '' : ' -translate-x-1/2'}`}
          style={{
            left: showSide ? '18.2%' : '50%',
            top: 'calc(50% - 235px)',
            width: '180px',
            height: '180px',
          }}
        >
          {rootTrack.coverArt
            ? <img src={rootTrack.coverArt} alt={rootTrack.title} className="size-full object-cover" />
            : <MusicPlaceholder />
          }
        </div>

        {/* Connecting line + right song — only when loading or a topSample exists */}
        {(isLoading || topSample) && (
          <>
            {/* Connecting line */}
            <div
              className="absolute h-px bg-[#1b2211]"
              style={{
                top: 'calc(50% - 145px)',
                left: 'calc(18.2% + 180px)',
                right: '37%',
              }}
            />

            {/* Right song row */}
            <div
              className="absolute flex flex-col gap-[8px]"
              style={{ left: '63%', top: 'calc(50% - 203px)', width: '345px' }}
            >
              {isLoading ? (
                <div className="flex items-center gap-[8px] pt-[4px] px-[8px]">
                  <div className="shrink-0 size-[42px] rounded-full bg-[#f0f0eb] animate-pulse" />
                  <div className="flex flex-1 flex-col gap-[2px]">
                    <div className="h-[22px] bg-[#f0f0eb] rounded animate-pulse w-3/4" />
                    <div className="h-[22px] bg-[#f0f0eb] rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ) : topSample ? (
                <div className="flex items-center gap-[8px] pt-[4px] px-[8px]">
                  <div className="shrink-0 size-[42px] rounded-full overflow-hidden border border-[#1b2211] relative">
                    {topSample.coverArt
                      ? <img src={topSample.coverArt} alt="" className="absolute inset-0 size-full object-cover" />
                      : <MusicPlaceholder />
                    }
                  </div>
                  <div className="flex flex-1 flex-col gap-[2px] min-w-0 justify-center">
                    <span className="text-[#2a2d2d] text-[18px] leading-[22px] tracking-[-0.36px] truncate" style={{ fontFamily: FONT_SANS_INTER }}>
                      {topSample.title}
                    </span>
                    <span className="text-[#676e6f] text-[14px] leading-[22px] tracking-[-0.28px] truncate" style={{ fontFamily: FONT_SANS_INTER }}>
                      {topSample.artist}
                    </span>
                  </div>
                  {topSample.year && (
                    <span className="shrink-0 text-[#676e6f] text-[14px] leading-[22px] tracking-[-0.28px]" style={{ fontFamily: FONT_SANS_INTER }}>
                      {topSample.year}
                    </span>
                  )}
                  <button
                    onClick={handleDiscover}
                    className="shrink-0 size-[24px] flex items-center justify-center text-[#2a2d2d] hover:text-[#676e6f] transition-colors"
                    aria-label="Discover graph"
                  >
                    <ArrowUpRight />
                  </button>
                </div>
              ) : null}
              <div className="w-full h-0 border-t border-[#1b2211]" />
            </div>

            {/* "popular node song" label */}
            <div
              className="absolute -translate-x-1/2"
              style={{ left: 'calc(50% + 324.5px)', top: 'calc(50% - 134px)' }}
            >
              <span
                className="text-[#676e6f] text-[14px] leading-[18px] tracking-[-0.28px] whitespace-nowrap"
                style={{ fontFamily: FONT_MONO }}
              >
                popular node song
              </span>
            </div>
          </>
        )}

        {/* Center cluster: blurred circles + discover link */}
        <div
          className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-[12px]"
          style={{ top: 'calc(50% - 134px)' }}
        >
          {previewTracks.length > 0 && (
            <div className="flex gap-[9px] items-center">
              {previewTracks.map((track) => (
                <div
                  key={track.id}
                  className="size-[28px] rounded-full overflow-hidden border border-[#1b2211] shrink-0"
                  style={{ filter: 'blur(2px)' }}
                >
                  {track.coverArt
                    ? <img src={track.coverArt} alt="" className="size-full object-cover" />
                    : <MusicPlaceholder />
                  }
                </div>
              ))}
            </div>
          )}

          {!isLoading && nodeCount > 0 && (
            <button
              onClick={handleDiscover}
              className={[
                'flex items-center justify-center px-1',
                'font-normal text-[#2a2d2d] text-[14px] leading-[18px] tracking-[-0.28px] underline decoration-solid',
                'hover:font-medium hover:bg-[#fbffe5]',
                'active:font-medium active:bg-[#f4ffc8]',
                'transition-colors',
              ].join(' ')}
              style={{ fontFamily: FONT_MONO }}
            >
              discover {nodeCount} nodes
            </button>
          )}
        </div>

        {/* Root song info row */}
        <div
          className={`absolute flex flex-col gap-[8px]${showSide ? '' : ' -translate-x-1/2'}`}
          style={{ left: showSide ? '12.8%' : '50%', top: 'calc(50% - 47px)', width: '345px' }}
        >
          <div className="flex items-center gap-[8px] pt-[4px] px-[8px]">
            <div className="flex flex-1 flex-col gap-[2px] min-w-0 justify-center">
              <span className="text-[#2a2d2d] text-[18px] leading-[22px] tracking-[-0.36px] truncate" style={{ fontFamily: FONT_SANS_INTER }}>
                {rootTrack.title}
              </span>
              <span className="text-[#676e6f] text-[14px] leading-[22px] tracking-[-0.28px] truncate" style={{ fontFamily: FONT_SANS_INTER }}>
                {genre ?? rootTrack.artist}
              </span>
            </div>
            {rootTrack.year && (
              <span className="shrink-0 text-[#676e6f] text-[14px] leading-[22px] tracking-[-0.28px]" style={{ fontFamily: FONT_SANS_INTER }}>
                {rootTrack.year}
              </span>
            )}
            <button
              onClick={handleDiscover}
              className="shrink-0 size-[24px] flex items-center justify-center text-[#2a2d2d] hover:text-[#676e6f] transition-colors"
              aria-label="Discover graph"
            >
              <ArrowUpRight />
            </button>
          </div>
          <div className="w-full h-px bg-[#1b2211]" />
        </div>

      </div>{/* end desktop */}

      {/* ─── Footer ───────────────────────────────────────────────────────── */}
      <div className="absolute bottom-[52px] left-1/2 -translate-x-1/2 pointer-events-none">
        <span className="text-[16px] leading-[20px] text-[#2a2d2d] tracking-[-0.32px] whitespace-nowrap" style={{ fontFamily: FONT_MONO }}>
          2026, Powered by Lucila and Christian
        </span>
      </div>
    </div>
    </div>
  )
}
