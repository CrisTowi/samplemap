import Graph from 'graphology'
import type Sigma from 'sigma'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import type { Settings } from 'sigma/settings'
import type { NodeDisplayData, PartialButFor } from 'sigma/types'

// ─── Edge direction colors (light background) ────────────────────────────────

export const EDGE_COLORS = {
  sampled_from: { dim: '#c0e0d4', bright: '#1D9E75' },
  sampled_in:   { dim: '#d4d2f0', bright: '#7F77DD' },
  unknown:      { dim: '#d8d8d6', bright: '#676e6f' },
}

export function getEdgeColor(direction: string | undefined, bright: boolean): string {
  if (direction === 'sampled_from') return bright ? EDGE_COLORS.sampled_from.bright : EDGE_COLORS.sampled_from.dim
  if (direction === 'sampled_in')   return bright ? EDGE_COLORS.sampled_in.bright   : EDGE_COLORS.sampled_in.dim
  return bright ? EDGE_COLORS.unknown.bright : EDGE_COLORS.unknown.dim
}

// ─── Module-level graph refs ─────────────────────────────────────────────────
// Stored here (outside the React component) so App can call runResetLayout
// without prop drilling, and so Fast Refresh doesn't object to mixed exports.

export const graphRefs: { sigma: Sigma | null; graphology: Graph | null } = {
  sigma: null,
  graphology: null,
}

// ─── Layout ──────────────────────────────────────────────────────────────────

const FA2_SETTINGS = {
  gravity: 8,
  scalingRatio: 1,
  slowDown: 8,
  adjustSizes: false,
}

// Total synchronous iterations per layout run. Running FA2 entirely
// synchronously means the user never sees nodes moving — they appear already
// in their final positions via the fade-in animation.
const FA2_SYNC_ITERATIONS = 300

// Cancels any in-flight layout animation (used by runResetLayout so a manual
// reset can restart synchronously without the old animation interfering).
let fa2AnimFrame: number | null = null

export function cancelFA2(): void {
  if (fa2AnimFrame !== null) {
    cancelAnimationFrame(fa2AnimFrame)
    fa2AnimFrame = null
  }
}

export function runFA2Animated(graphology: Graph, sigma: Sigma): void {
  // Cancel any previous animated run before re-running synchronously,
  // so incremental node additions don't stack animations.
  cancelFA2()

  forceAtlas2.assign(graphology, {
    iterations: FA2_SYNC_ITERATIONS,
    settings: { ...FA2_SETTINGS, barnesHutOptimize: graphology.order > 50 },
  })

  sigma.refresh()
}

export function exportGraphAsPNG(): void {
  const { sigma } = graphRefs
  if (!sigma) return

  const container = sigma.getContainer()
  const canvases = container.querySelectorAll('canvas')

  const combined = document.createElement('canvas')
  combined.width = container.offsetWidth
  combined.height = container.offsetHeight
  const ctx = combined.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, combined.width, combined.height)

  canvases.forEach((canvas) => {
    try {
      ctx.drawImage(canvas, 0, 0)
    } catch {
      // Skip canvas layers that are cross-origin or empty
    }
  })

  const link = document.createElement('a')
  link.download = 'samplemap-graph.png'
  link.href = combined.toDataURL('image/png')
  link.click()
}

export function runResetLayout(): void {
  const { sigma, graphology } = graphRefs
  if (!sigma || !graphology) return
  runFA2Animated(graphology, sigma)
  sigma.getCamera().animatedReset({ duration: 600 })
}

// ─── Fade-in animation ───────────────────────────────────────────────────────

export function animateFadeIn(graphology: Graph, sigma: Sigma): void {
  const STEPS = 20
  let step = 0
  const tick = () => {
    step++
    const opacity = step / STEPS
    graphology.forEachNode((nodeId) => {
      const current = graphology.getNodeAttribute(nodeId, 'opacity') as number ?? 1
      if (current < 1) {
        graphology.setNodeAttribute(nodeId, 'opacity', Math.min(opacity, 1))
      }
    })
    sigma.refresh()
    if (step < STEPS) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

// ─── Hover highlight + scale animation ───────────────────────────────────────

const HOVER_SCALE = 1.7
const HOVER_ANIM_FRAMES = 12

let hoverAnimFrame: number | null = null
let hoveredNodeId: string | null = null
let hoveredNodeBaseSize: number = 0

function cancelHoverAnim(): void {
  if (hoverAnimFrame !== null) {
    cancelAnimationFrame(hoverAnimFrame)
    hoverAnimFrame = null
  }
}

function animateNodeSize(
  graphology: Graph,
  sigma: Sigma,
  nodeId: string,
  fromSize: number,
  toSize: number,
  onDone?: () => void
): void {
  cancelHoverAnim()
  let frame = 0

  const tick = () => {
    frame++
    const progress = frame / HOVER_ANIM_FRAMES
    // Ease out cubic
    const eased = 1 - Math.pow(1 - Math.min(progress, 1), 3)
    const size = fromSize + (toSize - fromSize) * eased

    if (graphology.hasNode(nodeId)) {
      graphology.setNodeAttribute(nodeId, 'size', size)
      sigma.refresh()
    }

    if (frame < HOVER_ANIM_FRAMES) {
      hoverAnimFrame = requestAnimationFrame(tick)
    } else {
      hoverAnimFrame = null
      onDone?.()
    }
  }

  hoverAnimFrame = requestAnimationFrame(tick)
}

export function applyHoverHighlight(graphology: Graph, sigma: Sigma, nodeId: string): void {
  const connectedEdges = new Set(graphology.edges(nodeId))
  const connectedNodes = new Set([nodeId, ...graphology.neighbors(nodeId)])

  graphology.forEachEdge((edgeId) => {
    if (connectedEdges.has(edgeId)) {
      const direction = graphology.getEdgeAttribute(edgeId, 'direction') as string | undefined
      graphology.setEdgeAttribute(edgeId, 'color', getEdgeColor(direction, true))
      graphology.setEdgeAttribute(edgeId, 'size', 1.5)
    } else {
      graphology.setEdgeAttribute(edgeId, 'color', '#e8e8e6')
      graphology.setEdgeAttribute(edgeId, 'size', 0.5)
    }
  })

  graphology.forEachNode((currentNodeId) => {
    if (!connectedNodes.has(currentNodeId)) {
      graphology.setNodeAttribute(currentNodeId, 'color', '#d4d6d6')
    }
  })

  // Animate the hovered node scaling up
  hoveredNodeId = nodeId
  hoveredNodeBaseSize = graphology.getNodeAttribute(nodeId, 'size') as number ?? 8
  animateNodeSize(graphology, sigma, nodeId, hoveredNodeBaseSize, hoveredNodeBaseSize * HOVER_SCALE)

  sigma.refresh()
}

export function clearHoverHighlight(
  graphology: Graph,
  sigma: Sigma,
  getNodeColor: (depth: number) => string,
  getDepth: (nodeId: string) => number
): void {
  graphology.forEachNode((nodeId) => {
    graphology.setNodeAttribute(nodeId, 'color', getNodeColor(getDepth(nodeId)))
  })
  graphology.forEachEdge((edgeId) => {
    const direction = graphology.getEdgeAttribute(edgeId, 'direction') as string | undefined
    graphology.setEdgeAttribute(edgeId, 'color', getEdgeColor(direction, false))
    graphology.setEdgeAttribute(edgeId, 'size', 0.5)
  })

  // Animate the previously hovered node back to its base size
  if (hoveredNodeId && graphology.hasNode(hoveredNodeId)) {
    const currentSize = graphology.getNodeAttribute(hoveredNodeId, 'size') as number ?? hoveredNodeBaseSize * HOVER_SCALE
    const nodeToRestore = hoveredNodeId
    const baseSize = hoveredNodeBaseSize
    animateNodeSize(graphology, sigma, nodeToRestore, currentSize, baseSize)
  }

  hoveredNodeId = null
  sigma.refresh()
}

// ─── Label renderers ─────────────────────────────────────────────────────────

const CANVAS_HEIGHT = 30
const CANVAS_WIDTH = 74
// Suppress unused warning — these are used in GraphLegend SVG dimensions
void CANVAS_HEIGHT, CANVAS_WIDTH

/**
 * Custom node label renderer — light pill background for white canvas.
 */
export function drawDarkLabel(
  context: CanvasRenderingContext2D,
  data: PartialButFor<NodeDisplayData, 'x' | 'y' | 'size' | 'label' | 'color'>,
  settings: Settings
): void {
  if (!data.label) return

  const size: number = settings.labelSize ?? 11
  const font: string = settings.labelFont ?? 'sans-serif'
  const weight: string = settings.labelWeight ?? '400'

  context.font = `${weight} ${size}px ${font}`

  const textWidth = context.measureText(data.label).width
  const x = Math.round(data.x + data.size + 4)
  const y = Math.round(data.y)
  const padX = 4
  const padY = 3

  context.fillStyle = 'rgba(255, 255, 255, 0.9)'
  context.beginPath()
  context.roundRect(x - padX, y - size / 2 - padY, textWidth + padX * 2, size + padY * 2, 4)
  context.fill()

  context.fillStyle = '#2a2d2d'
  context.fillText(data.label, x, y + size / 2 - 1)
}

/**
 * Custom node hover renderer — subtle glow ring + node body + light label.
 */
export function drawDarkNodeHover(
  context: CanvasRenderingContext2D,
  data: PartialButFor<NodeDisplayData, 'x' | 'y' | 'size' | 'label' | 'color'>,
  settings: Settings
): void {
  const { x, y, size, color } = data

  // Outer glow (subtle on white)
  context.beginPath()
  context.arc(x, y, size + 6, 0, Math.PI * 2)
  context.fillStyle = `${color}22`
  context.fill()

  // Border ring
  context.beginPath()
  context.arc(x, y, size + 2, 0, Math.PI * 2)
  context.strokeStyle = color ?? '#1b2211'
  context.lineWidth = 1.5
  context.stroke()

  // Node body
  context.beginPath()
  context.arc(x, y, size, 0, Math.PI * 2)
  context.fillStyle = color ?? '#676e6f'
  context.fill()

  drawDarkLabel(context, data, settings)
}
