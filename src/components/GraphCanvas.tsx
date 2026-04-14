import { useEffect, useRef } from 'react'
import Graph from 'graphology'
import Sigma from 'sigma'
import { useGraphStore } from '../store/graphStore'
import {
  graphRefs,
  runFA2Animated,
  animateFadeIn,
  applyHoverHighlight,
  clearHoverHighlight,
  drawDarkLabel,
  drawDarkNodeHover,
} from './graphHelpers'

const NODE_COLORS = {
  root: '#7F77DD',
  depth1: '#1D9E75',
  depthN: '#888780',
}

function computeNodeSize(connections: number): number {
  return Math.min(8 + connections * 2, 28)
}

function getNodeColor(depth: number): string {
  if (depth === 0) return NODE_COLORS.root
  if (depth === 1) return NODE_COLORS.depth1
  return NODE_COLORS.depthN
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
      defaultEdgeColor: '#555553',
      defaultEdgeType: 'arrow',
      labelColor: { color: '#d4d4d2' },
      labelSize: 11,
      minCameraRatio: 0.1,
      maxCameraRatio: 10,
      defaultDrawNodeLabel: drawDarkLabel,
      defaultDrawNodeHover: drawDarkNodeHover,
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

    // Remove stale nodes
    for (const nodeId of graphology.nodes()) {
      if (!graphState.nodes.has(nodeId)) graphology.dropNode(nodeId)
    }

    // Add / update nodes
    for (const [nodeId, node] of graphState.nodes) {
      const connections = node.sampleCount.sampledIn + node.sampleCount.sampledFrom
      if (!graphology.hasNode(nodeId)) {
        graphology.addNode(nodeId, {
          label: `${node.artist} – ${node.title}`,
          size: computeNodeSize(connections),
          color: getNodeColor(node.depth),
          x: (Math.random() - 0.5) * 12,
          y: (Math.random() - 0.5) * 12,
          opacity: 0,
        })
      } else {
        graphology.setNodeAttribute(nodeId, 'color', getNodeColor(node.depth))
        graphology.setNodeAttribute(nodeId, 'size', computeNodeSize(connections))
      }
    }

    // Add missing edges
    for (const [edgeId, edge] of graphState.edges) {
      if (!graphology.hasEdge(edgeId)) {
        if (graphology.hasNode(edge.sourceId) && graphology.hasNode(edge.targetId)) {
          graphology.addDirectedEdgeWithKey(edgeId, edge.sourceId, edge.targetId, {
            size: 0.5,
            color: '#555553',
          })
        }
      }
    }

    if (graphology.order > previousNodeCount) animateFadeIn(graphology, sigma)
    if (graphology.order > 1) runFA2Animated(graphology, sigma)
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
