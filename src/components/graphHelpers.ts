import Graph from 'graphology'
import type Sigma from 'sigma'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import type { Settings } from 'sigma/settings'
import type { NodeDisplayData, PartialButFor } from 'sigma/types'

// ─── Module-level graph refs ─────────────────────────────────────────────────
// Stored here (outside the React component) so App can call runResetLayout
// without prop drilling, and so Fast Refresh doesn't object to mixed exports.

export const graphRefs: { sigma: Sigma | null; graphology: Graph | null } = {
  sigma: null,
  graphology: null,
}

// ─── Layout ──────────────────────────────────────────────────────────────────

const FA2_FRAME_ITERATIONS = 4
const FA2_TOTAL_FRAMES = 60

export function runFA2Animated(graphology: Graph, sigma: Sigma): void {
  let frame = 0
  const tick = () => {
    frame++
    forceAtlas2.assign(graphology, {
      iterations: FA2_FRAME_ITERATIONS,
      settings: {
        gravity: 1,
        scalingRatio: 10,
        slowDown: 8,
        barnesHutOptimize: graphology.order > 50,
      },
    })
    sigma.refresh()
    if (frame < FA2_TOTAL_FRAMES) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
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

// ─── Hover highlight ─────────────────────────────────────────────────────────

export function applyHoverHighlight(graphology: Graph, sigma: Sigma, nodeId: string): void {
  const connectedEdges = new Set(graphology.edges(nodeId))
  const connectedNodes = new Set([nodeId, ...graphology.neighbors(nodeId)])

  graphology.forEachEdge((edgeId) => {
    if (connectedEdges.has(edgeId)) {
      graphology.setEdgeAttribute(edgeId, 'color', '#aaa8a2')
      graphology.setEdgeAttribute(edgeId, 'size', 1.5)
    } else {
      graphology.setEdgeAttribute(edgeId, 'color', '#2a2a2a')
      graphology.setEdgeAttribute(edgeId, 'size', 0.5)
    }
  })

  graphology.forEachNode((currentNodeId) => {
    if (!connectedNodes.has(currentNodeId)) {
      graphology.setNodeAttribute(currentNodeId, 'color', '#3a3a3a')
    }
  })

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
    graphology.setEdgeAttribute(edgeId, 'color', '#555553')
    graphology.setEdgeAttribute(edgeId, 'size', 0.5)
  })
  sigma.refresh()
}

// ─── Label renderers ─────────────────────────────────────────────────────────

const CANVAS_HEIGHT = 30
const CANVAS_WIDTH = 74
// Suppress unused warning — these are used in GraphLegend SVG dimensions
void CANVAS_HEIGHT, CANVAS_WIDTH

/**
 * Custom node label renderer — dark pill background instead of Sigma's default white.
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

  context.fillStyle = 'rgba(18, 18, 22, 0.82)'
  context.beginPath()
  context.roundRect(x - padX, y - size / 2 - padY, textWidth + padX * 2, size + padY * 2, 4)
  context.fill()

  context.fillStyle = '#d4d4d2'
  context.fillText(data.label, x, y + size / 2 - 1)
}

/**
 * Custom node hover renderer — glow ring + node body + dark label.
 */
export function drawDarkNodeHover(
  context: CanvasRenderingContext2D,
  data: PartialButFor<NodeDisplayData, 'x' | 'y' | 'size' | 'label' | 'color'>,
  settings: Settings
): void {
  const { x, y, size, color } = data

  // Outer glow
  context.beginPath()
  context.arc(x, y, size + 6, 0, Math.PI * 2)
  context.fillStyle = `${color}33`
  context.fill()

  // Border ring
  context.beginPath()
  context.arc(x, y, size + 2, 0, Math.PI * 2)
  context.strokeStyle = color ?? '#fff'
  context.lineWidth = 2
  context.stroke()

  // Node body
  context.beginPath()
  context.arc(x, y, size, 0, Math.PI * 2)
  context.fillStyle = color ?? '#888'
  context.fill()

  drawDarkLabel(context, data, settings)
}
