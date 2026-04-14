import { useEffect, useState } from 'react'
import { useGraphStore } from '../store/graphStore'
import { graphRefs } from './graphHelpers'

interface RingPosition {
  x: number
  y: number
  size: number
  color: string
}

const NODE_COLORS: Record<number, string> = {
  0: '#7F77DD',
  1: '#1D9E75',
}

function getNodeColor(depth: number): string {
  return NODE_COLORS[depth] ?? '#888780'
}

export default function SelectedNodeRing() {
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId)
  const nodes = useGraphStore((state) => state.graph.nodes)
  const [position, setPosition] = useState<RingPosition | null>(null)

  useEffect(() => {
    if (!selectedNodeId) {
      setPosition(null)
      return
    }

    let rafId: number

    const update = () => {
      const { sigma, graphology } = graphRefs
      if (!sigma || !graphology || !graphology.hasNode(selectedNodeId)) {
        rafId = requestAnimationFrame(update)
        return
      }

      const nodeX = graphology.getNodeAttribute(selectedNodeId, 'x') as number
      const nodeY = graphology.getNodeAttribute(selectedNodeId, 'y') as number
      const nodeSize = graphology.getNodeAttribute(selectedNodeId, 'size') as number
      const viewport = sigma.graphToViewport({ x: nodeX, y: nodeY })
      const node = nodes.get(selectedNodeId)

      setPosition({
        x: viewport.x,
        y: viewport.y,
        size: nodeSize,
        color: node ? getNodeColor(node.depth) : '#7F77DD',
      })

      rafId = requestAnimationFrame(update)
    }

    rafId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(rafId)
  }, [selectedNodeId, nodes])

  if (!position) return null

  const ringDiameter = position.size * 5

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
        width: ringDiameter,
        height: ringDiameter,
      }}
    >
      {/* Outer ping ring */}
      <div
        className="absolute inset-0 rounded-full animate-ping"
        style={{
          border: `2px solid ${position.color}`,
          opacity: 0.4,
        }}
      />
      {/* Static inner ring */}
      <div
        className="absolute inset-[20%] rounded-full"
        style={{
          border: `1.5px solid ${position.color}`,
          opacity: 0.6,
        }}
      />
    </div>
  )
}
