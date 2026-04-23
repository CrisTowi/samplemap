import { useEffect, useState, useCallback } from 'react'
import { useGraphStore } from '../store/graphStore'
import { graphRefs } from './graphHelpers'

const FONT_MONO = "'IBM Plex Mono', monospace"
// Pixels of margin — node must be this far inside the viewport to be considered visible
const VISIBILITY_MARGIN = 40

export default function RecenterButton() {
  const rootId = useGraphStore((state) => state.graph.rootId)
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId)
  const isPanelMinimized = useGraphStore((state) => state.isPanelMinimized)
  const [isOffScreen, setIsOffScreen] = useState(false)

  const checkVisibility = useCallback(() => {
    const { sigma, graphology } = graphRefs
    if (!sigma || !graphology || !rootId || !graphology.hasNode(rootId)) return

    const nodeX = graphology.getNodeAttribute(rootId, 'x') as number
    const nodeY = graphology.getNodeAttribute(rootId, 'y') as number
    const viewport = sigma.graphToViewport({ x: nodeX, y: nodeY })
    const container = sigma.getContainer()
    const { width, height } = container.getBoundingClientRect()

    const visible =
      viewport.x >= VISIBILITY_MARGIN &&
      viewport.x <= width - VISIBILITY_MARGIN &&
      viewport.y >= VISIBILITY_MARGIN &&
      viewport.y <= height - VISIBILITY_MARGIN

    setIsOffScreen(!visible)
  }, [rootId])

  useEffect(() => {
    if (!rootId) {
      setIsOffScreen(false)
      return
    }

    // Wait one frame for sigma to be ready, then attach camera listener
    const rafId = requestAnimationFrame(() => {
      const { sigma } = graphRefs
      if (!sigma) return

      const camera = sigma.getCamera()
      camera.on('updated', checkVisibility)
      checkVisibility()
    })

    return () => {
      cancelAnimationFrame(rafId)
      const { sigma } = graphRefs
      if (sigma) sigma.getCamera().off('updated', checkVisibility)
    }
  }, [rootId, checkVisibility])

  const handleRecenter = () => {
    const { sigma, graphology } = graphRefs
    if (!sigma || !graphology || !rootId || !graphology.hasNode(rootId)) return

    const nodeX = graphology.getNodeAttribute(rootId, 'x') as number
    const nodeY = graphology.getNodeAttribute(rootId, 'y') as number

    // graphToViewport gives the node's current screen position.
    // viewportToFramedGraph converts that to the camera's internal coordinate space.
    // Setting the camera to those framed coords centers the viewport on the node.
    const nodeViewport = sigma.graphToViewport({ x: nodeX, y: nodeY })
    const framedTarget = sigma.viewportToFramedGraph(nodeViewport)

    sigma.getCamera().animate(
      { x: framedTarget.x, y: framedTarget.y, ratio: 1 },
      { duration: 500, easing: 'quadraticInOut' }
    )
  }

  if (!isOffScreen) return null

  const panelOpen = selectedNodeId !== null
  const bottomOffset = !panelOpen
    ? '24px'
    : isPanelMinimized
      ? '80px'
      : 'calc(min(55vh, 500px) + 24px)'

  return (
    <button
      onClick={handleRecenter}
      className={[
        'fixed right-6 z-[25]',
        'flex items-center gap-1.5 px-3 py-1.5',
        'bg-white border border-[#1b2211] rounded-full shadow-sm',
        'text-[#2a2d2d] text-[12px] leading-[16px] tracking-[-0.24px]',
        'hover:bg-[#fbffe5] active:bg-[#f4ffc8] transition-colors cursor-yellow-circle',
      ].join(' ')}
      style={{
        fontFamily: FONT_MONO,
        bottom: bottomOffset,
        transition: 'bottom 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 1.5a4.5 4.5 0 0 1 4.5 4.5c0 3.2-4.5 8.5-4.5 8.5S3.5 9.2 3.5 6A4.5 4.5 0 0 1 8 1.5z" />
        <circle cx="8" cy="6" r="1.5" />
      </svg>
      Recenter
    </button>
  )
}
