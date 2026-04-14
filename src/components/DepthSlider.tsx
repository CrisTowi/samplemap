import { useState, useEffect } from 'react'
import { useGraphStore } from '../store/graphStore'
import { rebuildFromRoot } from '../services/graphBuilder'

export default function DepthSlider() {
  const maxDepth = useGraphStore((state) => state.graph.maxDepth)
  const setMaxDepth = useGraphStore((state) => state.setMaxDepth)
  const rootId = useGraphStore((state) => state.graph.rootId)

  // Local display value updates instantly while dragging.
  // The store + rebuild only fires on pointer release.
  const [displayDepth, setDisplayDepth] = useState(maxDepth)

  // Keep display in sync if store changes externally (e.g. initial load)
  useEffect(() => {
    setDisplayDepth(maxDepth)
  }, [maxDepth])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayDepth(Number(event.target.value))
  }

  const handleCommit = async (event: React.PointerEvent<HTMLInputElement>) => {
    const depth = Number((event.target as HTMLInputElement).value)
    setMaxDepth(depth)
    if (rootId) {
      await rebuildFromRoot()
    }
  }

  if (!rootId) return null

  return (
    <div className="flex items-center gap-3 bg-black/50 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3">
      <span className="text-white/50 text-xs font-medium uppercase tracking-wider">Depth</span>
      <input
        type="range"
        min={1}
        max={4}
        value={displayDepth}
        onChange={handleChange}
        onPointerUp={handleCommit}
        className="w-24 accent-[#7F77DD] cursor-pointer"
      />
      <span className="text-white text-sm font-semibold w-4 text-center">{displayDepth}</span>
    </div>
  )
}
