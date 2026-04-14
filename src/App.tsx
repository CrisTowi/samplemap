import { useEffect } from 'react'
import GraphCanvas from './components/GraphCanvas'
import SearchBar from './components/SearchBar'
import InfoPanel from './components/InfoPanel'
import SettingsPanel from './components/SettingsPanel'
import DepthSlider from './components/DepthSlider'
import { useGraphStore } from './store/graphStore'
import { amenBrother, MOCK_SAMPLE_RELATIONSHIPS } from './mocks/whosampled'
import type { GraphNode, SampleEdge } from './types'

// Load mock graph on mount so Phase 1 has visible data
function useMockGraph() {
  const setRoot = useGraphStore((state) => state.setRoot)
  const addNodes = useGraphStore((state) => state.addNodes)

  useEffect(() => {
    setRoot(amenBrother)

    const relationships = MOCK_SAMPLE_RELATIONSHIPS[amenBrother.id]
    if (!relationships) return

    const depth1Nodes: GraphNode[] = [
      ...relationships.sampledIn,
      ...relationships.sampledFrom,
    ].map((track) => ({
      ...track,
      depth: 1,
      isRoot: false,
      isExpanded: false,
      isLoading: false,
    }))

    const depth1Edges: SampleEdge[] = [
      ...relationships.sampledIn.map((track) => ({
        id: `${track.id}-->${amenBrother.id}`,
        sourceId: track.id,
        targetId: amenBrother.id,
      })),
      ...relationships.sampledFrom.map((track) => ({
        id: `${amenBrother.id}-->${track.id}`,
        sourceId: amenBrother.id,
        targetId: track.id,
      })),
    ]

    addNodes(depth1Nodes, depth1Edges)

    // Depth 2 — expand each depth-1 node
    for (const node of depth1Nodes) {
      const nodeRelationships = MOCK_SAMPLE_RELATIONSHIPS[node.id]
      if (!nodeRelationships) continue

      const depth2Nodes: GraphNode[] = [
        ...nodeRelationships.sampledIn,
        ...nodeRelationships.sampledFrom,
      ].map((track) => ({
        ...track,
        depth: 2,
        isRoot: false,
        isExpanded: false,
        isLoading: false,
      }))

      const depth2Edges: SampleEdge[] = [
        ...nodeRelationships.sampledIn.map((track) => ({
          id: `${track.id}-->${node.id}`,
          sourceId: track.id,
          targetId: node.id,
        })),
        ...nodeRelationships.sampledFrom.map((track) => ({
          id: `${node.id}-->${track.id}`,
          sourceId: node.id,
          targetId: track.id,
        })),
      ]

      addNodes(depth2Nodes, depth2Edges)
    }
  }, [setRoot, addNodes])
}

export default function App() {
  useMockGraph()

  const toggleSettings = useGraphStore((state) => state.toggleSettings)

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#1a1a1e]">
      {/* Full-screen graph canvas */}
      <GraphCanvas />

      {/* Top bar */}
      <header className="absolute top-0 left-0 right-0 z-10 flex items-center gap-4 px-4 py-3 bg-black/40 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-md bg-[#7F77DD] flex items-center justify-center text-white font-bold text-sm">
            S
          </div>
          <span className="text-white font-semibold text-sm tracking-wide">SampleMap</span>
        </div>

        <SearchBar />

        <button
          onClick={toggleSettings}
          className="ml-auto p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Open settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

      {/* Bottom-left: depth slider stub */}
      <div className="absolute bottom-6 left-6 z-10">
        <DepthSlider />
      </div>

      {/* Right panel: info panel stub */}
      <div className="absolute top-16 right-0 bottom-0 z-10">
        <InfoPanel />
      </div>

      {/* Settings panel stub */}
      <SettingsPanel />
    </div>
  )
}
