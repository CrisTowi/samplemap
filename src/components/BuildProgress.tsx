import { useGraphStore } from '../store/graphStore'

export default function BuildProgress() {
  const isBuilding = useGraphStore((state) => state.isBuilding)

  if (!isBuilding) return null

  return (
    <div className="absolute top-[53px] left-0 right-0 h-[2px] z-20 overflow-hidden bg-transparent">
      <div className="h-full bg-[#7F77DD] animate-progress-bar" />
    </div>
  )
}
