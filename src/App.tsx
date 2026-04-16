import GraphCanvas from './components/GraphCanvas'
import SearchPage from './components/SearchPage'
import NodePreviewPage from './components/NodePreviewPage'
import InfoPanel from './components/InfoPanel'
import ToastContainer from './components/ToastContainer'
import BuildProgress from './components/BuildProgress'
import SelectedNodeRing from './components/SelectedNodeRing'
import RecenterButton from './components/RecenterButton'
import { useGraphStore } from './store/graphStore'
import { runResetLayout } from './components/graphHelpers'

const LAYOUT_LABELS = { tree: 'Tree', radial: 'Radial' } as const

const FONT_MONO = "'IBM Plex Mono', monospace"

export default function App() {
  const rootId = useGraphStore((state) => state.graph.rootId)
  const isCapped = useGraphStore((state) => state.graph.isCapped)
  const resetGraph = useGraphStore((state) => state.resetGraph)
  const setPreviewTrack = useGraphStore((state) => state.setPreviewTrack)
  const previewTrack = useGraphStore((state) => state.previewTrack)
  const layoutMode = useGraphStore((state) => state.layoutMode)
  const setLayoutMode = useGraphStore((state) => state.setLayoutMode)

  // Search entrypoint — full-page light-themed search experience
  if (!rootId && !previewTrack) {
    return (
      <>
        <SearchPage />
        <ToastContainer />
      </>
    )
  }

  // Node preview — intermediate state between search and full graph
  if (!rootId && previewTrack) {
    return (
      <>
        <NodePreviewPage />
        <ToastContainer />
      </>
    )
  }

  const handleNewSearch = () => {
    resetGraph()
    setPreviewTrack(null)
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-white">
      {/* Full-screen graph canvas */}
      <GraphCanvas />

      {/* Pulsing ring overlay for selected node */}
      <SelectedNodeRing />

      {/* Top bar — white background prevents node overlap */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white border-b border-[#e8e8e4]">
        <div className="flex items-center h-[72px] px-4 sm:px-[44px]">

          {/* Left: New search */}
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

          {/* Center: Logo */}
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

          {/* Right: Layout controls (hidden on mobile) */}
          <div className="flex-1 hidden sm:flex items-center justify-end gap-4">
            {/* Tree / Radial toggle */}
            <div className="flex items-center gap-1 bg-[#f4f4f0] rounded-lg p-0.5">
              {(['tree', 'radial'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setLayoutMode(mode)}
                  className={[
                    'px-2 py-0.5 rounded-md text-[12px] leading-[18px] tracking-[-0.24px] transition-colors',
                    layoutMode === mode
                      ? 'bg-white text-[#1b2211] font-medium shadow-sm'
                      : 'text-[#676e6f] hover:text-[#2a2d2d]',
                  ].join(' ')}
                  style={{ fontFamily: FONT_MONO }}
                >
                  {LAYOUT_LABELS[mode]}
                </button>
              ))}
            </div>

            {/* Reset layout */}
            <button
              onClick={runResetLayout}
              className={[
                'flex items-center justify-center px-1',
                'font-normal text-[#2a2d2d] text-[14px] leading-[18px] tracking-[-0.28px] underline decoration-solid',
                'hover:font-medium hover:bg-[#fbffe5]',
                'active:font-medium active:bg-[#f4ffc8]',
                'transition-colors',
              ].join(' ')}
              style={{ fontFamily: FONT_MONO }}
            >
              Reset layout
            </button>
          </div>

          {/* Mobile spacer — keeps logo centered when right controls are hidden */}
          <div className="flex-1 sm:hidden" />
        </div>
      </div>

      {/* Top progress bar — sits just below the header */}
      <BuildProgress />

      {/* Node cap banner */}
      {isCapped && (
        <div className="absolute top-[80px] left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-yellow-50 border border-yellow-300 rounded-xl px-4 py-2.5 text-yellow-800 text-sm max-w-[90vw]">
          <span>Graph capped at 150 nodes. Click any node and use &ldquo;Expand from here&rdquo; to explore further.</span>
          <button
            onClick={() => resetGraph()}
            className="text-yellow-600 hover:text-yellow-900 text-lg leading-none shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Recenter button — appears when root node is off-screen */}
      <RecenterButton />

      {/* Bottom sheet track panel (self-positioned, all screen sizes) */}
      <InfoPanel />

      {/* Toasts */}
      <ToastContainer />
    </div>
  )
}
