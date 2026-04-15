import { useGraphStore } from '../store/graphStore'
import { rebuildFromRoot } from '../services/graphBuilder'

const DEPTH_OPTIONS = [1, 2, 3]

export default function DepthSlider() {
  const maxDepth = useGraphStore((state) => state.graph.maxDepth)
  const setMaxDepth = useGraphStore((state) => state.setMaxDepth)
  const rootId = useGraphStore((state) => state.graph.rootId)
  const isBuilding = useGraphStore((state) => state.isBuilding)

  if (!rootId) return null

  const handleSelect = async (depth: number) => {
    if (depth === maxDepth || isBuilding) return
    setMaxDepth(depth)
    await rebuildFromRoot()
  }

  return (
    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3">
      <span className="text-white/50 text-xs font-medium uppercase tracking-wider mr-1">Depth</span>
      {DEPTH_OPTIONS.map((depth) => (
        <button
          key={depth}
          onClick={() => handleSelect(depth)}
          disabled={isBuilding}
          className={`w-6 rounded-md text-xs font-semibold transition-colors ${
            depth === maxDepth
              ? 'bg-[#7F77DD] text-white'
              : 'text-white/40 hover:text-white/70 hover:bg-white/10'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {depth}
        </button>
      ))}
    </div>
  )
}
