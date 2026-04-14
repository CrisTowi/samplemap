import GraphCanvas from './components/GraphCanvas'
import SearchBar from './components/SearchBar'
import InfoPanel from './components/InfoPanel'
import SettingsPanel from './components/SettingsPanel'
import DepthSlider from './components/DepthSlider'
import GraphLegend from './components/GraphLegend'
import ToastContainer from './components/ToastContainer'
import BuildProgress from './components/BuildProgress'
import { useGraphStore } from './store/graphStore'
import { runResetLayout } from './components/graphHelpers'

export default function App() {
  const toggleSettings = useGraphStore((state) => state.toggleSettings)
  const rootId = useGraphStore((state) => state.graph.rootId)
  const isCapped = useGraphStore((state) => state.graph.isCapped)
  const resetGraph = useGraphStore((state) => state.resetGraph)
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId)

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#1a1a1e]">
      {/* Full-screen graph canvas */}
      <GraphCanvas />

      {/* Top progress bar */}
      <BuildProgress />

      {/* Node cap banner */}
      {isCapped && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-yellow-900/80 border border-yellow-500/40 rounded-xl px-4 py-2.5 text-yellow-200 text-sm backdrop-blur-sm max-w-[90vw]">
          <span>Graph capped at 150 nodes. Click any node and use &ldquo;Expand from here&rdquo; to explore a sub-graph.</span>
          <button
            onClick={() => resetGraph()}
            className="text-yellow-400 hover:text-yellow-100 text-lg leading-none shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Top bar */}
      <header className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 px-4 py-3 bg-black/40 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-md bg-[#7F77DD] flex items-center justify-center text-white font-bold text-sm select-none">
            S
          </div>
          <span className="text-white font-semibold text-sm tracking-wide hidden sm:block">SampleMap</span>
        </div>

        <SearchBar />

        {rootId && (
          <button
            onClick={runResetLayout}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            title="Reset layout"
            aria-label="Reset graph layout"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        )}

        <button
          onClick={toggleSettings}
          className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          aria-label="Open settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

      {/* Empty state */}
      {!rootId && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-0 pointer-events-none">
          <p className="text-white/15 text-sm mt-24 text-center px-4">
            Try: &ldquo;Amen Brother&rdquo;, &ldquo;Think (Lyn Collins)&rdquo;, &ldquo;Funky Drummer&rdquo;
            <br className="sm:hidden" />
            <span className="hidden sm:inline"> · </span>
            or paste a YouTube / Spotify URL
          </p>
        </div>
      )}

      {/* Desktop: bottom-left depth slider + legend */}
      <div className="hidden sm:flex absolute bottom-6 left-6 z-10 items-end gap-3">
        <DepthSlider />
        {rootId && <GraphLegend />}
      </div>

      {/* Mobile: bottom bar with depth slider */}
      {rootId && (
        <div className="sm:hidden absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-4 px-4 py-3 bg-black/60 backdrop-blur-sm border-t border-white/10">
          <DepthSlider />
        </div>
      )}

      {/* Desktop: right info panel */}
      <div className="hidden sm:block absolute top-[53px] right-0 bottom-0 z-10">
        <InfoPanel />
      </div>

      {/* Mobile: bottom drawer info panel */}
      {selectedNodeId && (
        <div className="sm:hidden absolute bottom-0 left-0 right-0 z-20 max-h-[65vh] overflow-y-auto bg-[#1a1a20]/95 backdrop-blur-md border-t border-white/10 rounded-t-2xl">
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1" />
          <InfoPanel />
        </div>
      )}

      {/* Toasts */}
      <ToastContainer />

      {/* Settings panel */}
      <SettingsPanel />
    </div>
  )
}
