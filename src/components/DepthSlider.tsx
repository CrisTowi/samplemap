import { useGraphStore } from '../store/graphStore'
// DepthSlider is no longer used — depth is now controlled interactively per node.

const FONT_MONO = "'IBM Plex Mono', monospace"
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
  }

  return (
    <div className="flex items-center gap-2 bg-white border border-[#1b2211] rounded-xl px-4 py-3">
      <span
        className="text-[#9ca4a4] text-[11px] leading-[16px] uppercase tracking-wider mr-1"
        style={{ fontFamily: FONT_MONO }}
      >
        Depth
      </span>
      {DEPTH_OPTIONS.map((depth) => (
        <button
          key={depth}
          onClick={() => handleSelect(depth)}
          disabled={isBuilding}
          className={[
            'w-6 rounded-md text-xs transition-colors',
            depth === maxDepth
              ? 'bg-[#1b2211] text-white font-semibold'
              : 'text-[#676e6f] hover:text-[#2a2d2d] hover:bg-[#fbffe5] cursor-yellow-circle',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          ].join(' ')}
          style={{ fontFamily: FONT_MONO }}
        >
          {depth}
        </button>
      ))}
    </div>
  )
}
