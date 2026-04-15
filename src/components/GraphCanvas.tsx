import { useEffect, useRef } from 'react'
import type { SampleEdge } from '../types'
import Graph from 'graphology'
import Sigma from 'sigma'
import { NodeImageProgram } from '@sigma/node-image'
import { useGraphStore } from '../store/graphStore'
import {
  graphRefs,
  runFA2Animated,
  animateFadeIn,
  applyHoverHighlight,
  clearHoverHighlight,
  drawDarkLabel,
  drawDarkNodeHover,
  getEdgeColor,
} from './graphHelpers'

const NODE_COLORS = {
  root: '#7F77DD',
  depth1: '#1D9E75',
  depthN: '#888780',
}


// Log scale on Genius pageviews: 10K → 11, 100K → 16, 1M → 21, 10M → 26
function computeNodeSize(pageviews: number | undefined): number {
  if (!pageviews) return 8
  return Math.min(6 + Math.max(0, Math.log10(pageviews) - 3) * 5, 28)
}

function getNodeColor(depth: number): string {
  if (depth === 0) return NODE_COLORS.root
  if (depth === 1) return NODE_COLORS.depth1
  return NODE_COLORS.depthN
}

const SPAWN_JITTER = 0.3

/**
 * For a newly added node, find the position of an already-placed neighbor so
 * the node can spawn adjacent to it instead of at a random canvas offset.
 */
function findParentPosition(
  graphology: Graph,
  nodeId: string,
  edges: Map<string, SampleEdge>
): { x: number; y: number } {
  for (const edge of edges.values()) {
    const neighborId =
      edge.targetId === nodeId ? edge.sourceId :
      edge.sourceId === nodeId ? edge.targetId :
      null

    if (neighborId && graphology.hasNode(neighborId)) {
      const parentX = graphology.getNodeAttribute(neighborId, 'x') as number
      const parentY = graphology.getNodeAttribute(neighborId, 'y') as number
      return {
        x: parentX + (Math.random() - 0.5) * SPAWN_JITTER,
        y: parentY + (Math.random() - 0.5) * SPAWN_JITTER,
      }
    }
  }
  // Fallback: no connected neighbor found yet, spawn near center
  return {
    x: (Math.random() - 0.5) * SPAWN_JITTER,
    y: (Math.random() - 0.5) * SPAWN_JITTER,
  }
}

export default function GraphCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sigmaRef = useRef<Sigma | null>(null)
  const graphologyRef = useRef<Graph | null>(null)

  const graphState = useGraphStore((state) => state.graph)
  const setSelectedNode = useGraphStore((state) => state.setSelectedNode)
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId)

  // Initialize Sigma once on mount
  useEffect(() => {
    if (!containerRef.current) return

    const graphology = new Graph({ type: 'directed', multi: false })
    graphologyRef.current = graphology
    graphRefs.graphology = graphology

    const sigma = new Sigma(graphology, containerRef.current, {
      renderEdgeLabels: false,
      defaultEdgeColor: '#333331',
      defaultEdgeType: 'arrow',
      labelColor: { color: '#d4d4d2' },
      labelSize: 11,
      minCameraRatio: 0.1,
      maxCameraRatio: 10,
      defaultDrawNodeLabel: drawDarkLabel,
      defaultDrawNodeHover: drawDarkNodeHover,
      nodeProgramClasses: {
        image: NodeImageProgram,
      },
    })
    sigmaRef.current = sigma
    graphRefs.sigma = sigma

    sigma.on('clickNode', ({ node }) => setSelectedNode(node))
    sigma.on('clickStage', () => setSelectedNode(null))

    sigma.on('enterNode', ({ node }) => {
      applyHoverHighlight(graphology, sigma, node)
    })

    sigma.on('leaveNode', () => {
      clearHoverHighlight(
        graphology,
        sigma,
        getNodeColor,
        (nodeId) => useGraphStore.getState().graph.nodes.get(nodeId)?.depth ?? 2
      )
    })

    return () => {
      sigma.kill()
      sigmaRef.current = null
      graphologyRef.current = null
      graphRefs.sigma = null
      graphRefs.graphology = null
    }
  }, [setSelectedNode])

  // Sync Zustand graph state → Graphology → Sigma
  useEffect(() => {
    const graphology = graphologyRef.current
    const sigma = sigmaRef.current
    if (!graphology || !sigma) return

    const previousNodeCount = graphology.order
    const rootId = useGraphStore.getState().graph.rootId

    // Remove stale nodes
    for (const nodeId of graphology.nodes()) {
      if (!graphState.nodes.has(nodeId)) graphology.dropNode(nodeId)
    }

    // Add / update nodes
    for (const [nodeId, node] of graphState.nodes) {
      const isRoot = nodeId === rootId
      const size = computeNodeSize(node.pageviews)

      if (!graphology.hasNode(nodeId)) {
        // Spawn near the parent node (if found) so FA2 doesn't have to drag it across the canvas
        const spawnPos = isRoot
          ? { x: 0, y: 0 }
          : findParentPosition(graphology, nodeId, graphState.edges)

        graphology.addNode(nodeId, {
          label: `${node.artist} – ${node.title}`,
          size,
          color: getNodeColor(node.depth),
          x: spawnPos.x,
          y: spawnPos.y,
          opacity: 0,
          // Image: use cover art if available, otherwise plain circle
          type: node.coverArt ? 'image' : 'circle',
          image: node.coverArt ?? null,
        })
      } else {
        graphology.setNodeAttribute(nodeId, 'color', getNodeColor(node.depth))
        graphology.setNodeAttribute(nodeId, 'size', size)
        // Update image if it became available after expansion
        if (node.coverArt && graphology.getNodeAttribute(nodeId, 'type') !== 'image') {
          graphology.setNodeAttribute(nodeId, 'type', 'image')
          graphology.setNodeAttribute(nodeId, 'image', node.coverArt)
        }
      }
    }

    // Add missing edges
    for (const [edgeId, edge] of graphState.edges) {
      if (!graphology.hasEdge(edgeId)) {
        if (graphology.hasNode(edge.sourceId) && graphology.hasNode(edge.targetId)) {
          graphology.addDirectedEdgeWithKey(edgeId, edge.sourceId, edge.targetId, {
            size: 0.5,
            color: getEdgeColor(edge.direction, false),
            direction: edge.direction,
          })
        }
      }
    }

    const nodesAdded = graphology.order > previousNodeCount
    if (nodesAdded) animateFadeIn(graphology, sigma)
    if (nodesAdded && graphology.order > 1) runFA2Animated(graphology, sigma)

    // On first load: center camera on the root node
    if (previousNodeCount === 0 && graphology.order > 0) {
      sigma.getCamera().animatedReset({ duration: 600 })
    }

    sigma.refresh()
  }, [graphState])

  // Selected node highlight ring
  useEffect(() => {
    const graphology = graphologyRef.current
    const sigma = sigmaRef.current
    if (!graphology || !sigma) return

    graphology.forEachNode((nodeId) => {
      graphology.setNodeAttribute(nodeId, 'highlighted', nodeId === selectedNodeId)
    })
    sigma.refresh()
  }, [selectedNodeId])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: '#1a1a1e' }}
    />
  )
}
