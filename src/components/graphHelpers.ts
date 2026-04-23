import Graph from 'graphology'
import type Sigma from 'sigma'
import type { Settings } from 'sigma/settings'
import type { NodeDisplayData, PartialButFor } from 'sigma/types'
import { useGraphStore } from '../store/graphStore'

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

export const graphRefs: { sigma: Sigma | null; graphology: Graph | null; rootId: string | null } = {
  sigma: null,
  graphology: null,
  rootId: null,
}

// ─── Left-to-right tree layout ───────────────────────────────────────────────

// Horizontal distance between depth levels
const X_STEP = 8
// Vertical space allocated per leaf node
const LEAF_SPACING = 3

/**
 * Counts the number of leaf nodes in the subtree rooted at nodeId.
 * A leaf is any node with no children in the current graph.
 * Results are memoized in `memo`.
 */
function countLeaves(
  nodeId: string,
  children: Map<string, string[]>,
  memo: Map<string, number>
): number {
  const cached = memo.get(nodeId)
  if (cached !== undefined) return cached

  const nodeChildren = children.get(nodeId)
  if (!nodeChildren || nodeChildren.length === 0) {
    memo.set(nodeId, 1)
    return 1
  }

  let total = 0
  for (const childId of nodeChildren) {
    total += countLeaves(childId, children, memo)
  }
  memo.set(nodeId, total)
  return total
}

/**
 * Recursively assigns x/y positions for a left-to-right tree layout.
 * x = depth * X_STEP (root at left, children to the right)
 * y = center of the vertical range allocated to this node's subtree
 *
 * startY is the top of the range allocated to this subtree (in graph coords,
 * higher y = higher on screen in Sigma). The total range height equals
 * leafCount * LEAF_SPACING.
 */
function assignTreePositions(
  nodeId: string,
  depth: number,
  startY: number,
  children: Map<string, string[]>,
  leafCounts: Map<string, number>,
  graphology: Graph,
  visited: Set<string>
): void {
  if (visited.has(nodeId)) return
  visited.add(nodeId)

  const leafCount = leafCounts.get(nodeId) ?? 1
  const centerY = startY + (leafCount * LEAF_SPACING) / 2

  graphology.setNodeAttribute(nodeId, 'x', depth * X_STEP)
  graphology.setNodeAttribute(nodeId, 'y', centerY)

  const nodeChildren = children.get(nodeId)
  if (!nodeChildren || nodeChildren.length === 0) return

  let childStartY = startY
  for (const childId of nodeChildren) {
    const childLeaves = leafCounts.get(childId) ?? 1
    assignTreePositions(childId, depth + 1, childStartY, children, leafCounts, graphology, visited)
    childStartY += childLeaves * LEAF_SPACING
  }
}

/**
 * Positions all nodes in a left-to-right tree layout.
 * Root → leftmost. Children expand to the right with each depth level.
 * Vertical positions are spaced proportionally to subtree size so no branches overlap.
 *
 * Uses the `parentId` attribute stored on each graphology node.
 */
export function computeTreeLayout(graphology: Graph, rootId: string): void {
  if (!graphology.hasNode(rootId)) return

  // Build parent → children map from `parentId` node attributes
  const children = new Map<string, string[]>()
  graphology.forEachNode((nodeId) => {
    const parentId = graphology.getNodeAttribute(nodeId, 'parentId') as string | undefined
    if (parentId && graphology.hasNode(parentId)) {
      if (!children.has(parentId)) children.set(parentId, [])
      children.get(parentId)!.push(nodeId)
    }
  })

  // Compute leaf counts for the whole tree
  const leafCounts = new Map<string, number>()
  countLeaves(rootId, children, leafCounts)

  // Center the tree vertically around y = 0
  const totalLeaves = leafCounts.get(rootId) ?? 1
  const startY = -(totalLeaves * LEAF_SPACING) / 2

  const visited = new Set<string>()
  assignTreePositions(rootId, 0, startY, children, leafCounts, graphology, visited)
}

// ─── Radial tree layout ───────────────────────────────────────────────────────

const RADIUS_STEP = 6

/**
 * Positions all nodes in a radial layout centered on rootId.
 * Root → center. Each depth level is placed on a circle of increasing radius.
 * Angular wedges are proportional to subtree size so branches don't overlap.
 */
export function computeRadialLayout(graphology: Graph, rootId: string): void {
  if (!graphology.hasNode(rootId)) return

  const children = new Map<string, string[]>()
  graphology.forEachNode((nodeId) => {
    const parentId = graphology.getNodeAttribute(nodeId, 'parentId') as string | undefined
    if (parentId && graphology.hasNode(parentId)) {
      if (!children.has(parentId)) children.set(parentId, [])
      children.get(parentId)!.push(nodeId)
    }
  })

  graphology.setNodeAttribute(rootId, 'x', 0)
  graphology.setNodeAttribute(rootId, 'y', 0)

  const visited = new Set<string>([rootId])
  const queue: Array<[string, number, number]> = [[rootId, 0, 2 * Math.PI]]

  while (queue.length > 0) {
    const [nodeId, startAngle, endAngle] = queue.shift()!
    const nodeChildren = children.get(nodeId)
    if (!nodeChildren || nodeChildren.length === 0) continue

    const depth = graphology.getNodeAttribute(nodeId, 'depth') as number ?? 0
    const childRadius = (depth + 1) * RADIUS_STEP
    const span = endAngle - startAngle
    const childCount = nodeChildren.length

    nodeChildren.forEach((childId, index) => {
      if (visited.has(childId)) return
      visited.add(childId)

      const angle = startAngle + span * (index + 0.5) / childCount
      graphology.setNodeAttribute(childId, 'x', Math.cos(angle) * childRadius)
      graphology.setNodeAttribute(childId, 'y', Math.sin(angle) * childRadius)

      const childSpan = span / childCount
      const childStart = startAngle + childSpan * index
      queue.push([childId, childStart, childStart + childSpan])
    })
  }
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
  link.download = 'node-record-graph.png'
  link.href = combined.toDataURL('image/png')
  link.click()
}

export function applyLayout(graphology: Graph, rootId: string): void {
  const mode = useGraphStore.getState().layoutMode
  if (mode === 'radial') {
    computeRadialLayout(graphology, rootId)
  } else {
    computeTreeLayout(graphology, rootId)
  }
}

const TRANSITION_FRAMES = 45

let layoutAnimFrame: number | null = null

/**
 * Animates node positions from their current location to where the new layout
 * places them. Uses ease-in-out cubic over TRANSITION_FRAMES frames.
 */
export function animateLayoutTransition(graphology: Graph, sigma: Sigma, rootId: string): void {
  // Cancel any in-flight transition
  if (layoutAnimFrame !== null) {
    cancelAnimationFrame(layoutAnimFrame)
    layoutAnimFrame = null
  }

  // Snapshot current positions
  const fromPositions = new Map<string, { x: number; y: number }>()
  graphology.forEachNode((nodeId) => {
    fromPositions.set(nodeId, {
      x: graphology.getNodeAttribute(nodeId, 'x') as number ?? 0,
      y: graphology.getNodeAttribute(nodeId, 'y') as number ?? 0,
    })
  })

  // Compute target positions (applyLayout writes directly to graphology)
  applyLayout(graphology, rootId)

  const toPositions = new Map<string, { x: number; y: number }>()
  graphology.forEachNode((nodeId) => {
    toPositions.set(nodeId, {
      x: graphology.getNodeAttribute(nodeId, 'x') as number ?? 0,
      y: graphology.getNodeAttribute(nodeId, 'y') as number ?? 0,
    })
  })

  // Restore the starting positions so the animation begins from where nodes are
  fromPositions.forEach(({ x, y }, nodeId) => {
    if (graphology.hasNode(nodeId)) {
      graphology.setNodeAttribute(nodeId, 'x', x)
      graphology.setNodeAttribute(nodeId, 'y', y)
    }
  })

  let frame = 0

  const tick = () => {
    frame++
    const progress = frame / TRANSITION_FRAMES
    // Ease-in-out cubic
    const eased = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2

    graphology.forEachNode((nodeId) => {
      const from = fromPositions.get(nodeId)
      const to = toPositions.get(nodeId)
      if (!from || !to) return
      graphology.setNodeAttribute(nodeId, 'x', from.x + (to.x - from.x) * eased)
      graphology.setNodeAttribute(nodeId, 'y', from.y + (to.y - from.y) * eased)
    })

    sigma.refresh()

    if (frame < TRANSITION_FRAMES) {
      layoutAnimFrame = requestAnimationFrame(tick)
    } else {
      layoutAnimFrame = null
    }
  }

  layoutAnimFrame = requestAnimationFrame(tick)
}

export function runResetLayout(): void {
  const { sigma, graphology, rootId } = graphRefs
  if (!sigma || !graphology || !rootId) return

  // Collapse all manually-expanded nodes (depth > 1) back to the initial state
  const store = useGraphStore.getState()
  const nodesToRemove: string[] = []
  store.graph.nodes.forEach((node, nodeId) => {
    if (node.depth > 1) nodesToRemove.push(nodeId)
  })

  if (nodesToRemove.length > 0) {
    // Remove from the store (syncs edges too)
    store.removeNodes(nodesToRemove)
    // Also drop from graphology immediately so the layout runs on the trimmed graph
    for (const nodeId of nodesToRemove) {
      if (graphology.hasNode(nodeId)) graphology.dropNode(nodeId)
    }
    // Mark all depth-1 nodes as unexpanded
    useGraphStore.setState((prev) => {
      const nodes = new Map(prev.graph.nodes)
      nodes.forEach((node, nodeId) => {
        if (node.depth === 1) nodes.set(nodeId, { ...node, isExpanded: false, isLoading: false })
      })
      return { graph: { ...prev.graph, nodes } }
    })
  }

  animateLayoutTransition(graphology, sigma, rootId)
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

  // Animate the previously hovered node back to its canonical base size.
  // Read `baseSize` from the node attribute (set at creation time) so rapid
  // enter/leave cycles during zoom can't corrupt the restore target.
  if (hoveredNodeId && graphology.hasNode(hoveredNodeId)) {
    const currentSize = graphology.getNodeAttribute(hoveredNodeId, 'size') as number ?? hoveredNodeBaseSize
    const baseSize = (graphology.getNodeAttribute(hoveredNodeId, 'baseSize') as number | undefined) ?? hoveredNodeBaseSize
    const nodeToRestore = hoveredNodeId
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
