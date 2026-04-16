import { useEffect, useRef } from 'react'
import Graph from 'graphology'
import Sigma from 'sigma'
import { NodeImageProgram } from '@sigma/node-image'
import { EdgeCurvedArrowProgram } from '@sigma/edge-curve'
import { useGraphStore } from '../store/graphStore'
import { expandNodeOnClick, collapseNode } from '../services/graphBuilder'
import {
  graphRefs,
  applyLayout,
  animateLayoutTransition,
  animateFadeIn,
  applyHoverHighlight,
  clearHoverHighlight,
  drawDarkLabel,
  drawDarkNodeHover,
  getEdgeColor,
} from './graphHelpers'

const NODE_COLORS = {
  root: '#1b2211',
  depth1: '#1D9E75',
  depthN: '#9ca4a4',
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

export default function GraphCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sigmaRef = useRef<Sigma | null>(null)
  const graphologyRef = useRef<Graph | null>(null)

  const graphState = useGraphStore((state) => state.graph)
  const setSelectedNode = useGraphStore((state) => state.setSelectedNode)
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId)
  const layoutMode = useGraphStore((state) => state.layoutMode)

  // Initialize Sigma once on mount
  useEffect(() => {
    if (!containerRef.current) return

    const graphology = new Graph({ type: 'directed', multi: false })
    graphologyRef.current = graphology
    graphRefs.graphology = graphology

    const sigma = new Sigma(graphology, containerRef.current, {
      renderEdgeLabels: false,
      defaultEdgeColor: '#d8d8d6',
      defaultEdgeType: 'curvedArrow',
      edgeProgramClasses: {
        curvedArrow: EdgeCurvedArrowProgram,
      },
      labelColor: { color: '#2a2d2d' },
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

    sigma.on('clickNode', ({ node }) => {
      const state = useGraphStore.getState()
      const graphNode = state.graph.nodes.get(node)
      if (!graphNode) return

      // Don't process clicks while the graph is already loading
      if (state.isBuilding || graphNode.isLoading) return

      // Panel is minimized (audio playing) — re-clicking the same node just expands
      if (state.isPanelMinimized && node === state.selectedNodeId) {
        state.setIsPanelMinimized(false)
        return
      }

      // Panel is minimized and user clicks a different node — show interrupt alert
      if (state.isPanelMinimized && node !== state.selectedNodeId) {
        state.setPendingNodeId(node)
        return
      }

      setSelectedNode(node)

      // Root: InfoPanel only — it's always expanded on load
      if (graphNode.isRoot) return

      if (graphNode.isExpanded) {
        collapseNode(node)
      } else {
        void (async () => {
          try {
            await expandNodeOnClick(node)
          } catch {
            // toast already shown by expandNodeOnClick internals
          }
        })()
      }
    })

    sigma.on('clickStage', () => {
      setSelectedNode(null)
      useGraphStore.getState().setIsPanelMinimized(false)
      useGraphStore.getState().setPendingNodeId(null)
    })

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
      graphRefs.rootId = null
    }
  }, [setSelectedNode])

  // Sync Zustand graph state → Graphology → Sigma
  useEffect(() => {
    const graphology = graphologyRef.current
    const sigma = sigmaRef.current
    if (!graphology || !sigma) return

    const previousNodeCount = graphology.order
    const rootId = useGraphStore.getState().graph.rootId

    // Keep graphRefs.rootId in sync so runResetLayout can use it
    graphRefs.rootId = rootId

    // Remove stale nodes
    for (const nodeId of graphology.nodes()) {
      if (!graphState.nodes.has(nodeId)) graphology.dropNode(nodeId)
    }

    // Add / update nodes
    for (const [nodeId, node] of graphState.nodes) {
      const isRoot = nodeId === rootId
      const size = computeNodeSize(node.pageviews)

      if (!graphology.hasNode(nodeId)) {
        graphology.addNode(nodeId, {
          label: `${node.artist} – ${node.title}`,
          size,
          baseSize: size,
          color: getNodeColor(node.depth),
          // Position will be set by computeTreeLayout; start at origin to avoid flash
          x: 0,
          y: 0,
          opacity: 0,
          type: node.coverArt ? 'image' : 'circle',
          image: node.coverArt ?? null,
          // Store parentId on the graphology node for layout computation
          parentId: isRoot ? undefined : node.parentId,
          depth: node.depth,
        })
      } else {
        graphology.setNodeAttribute(nodeId, 'color', getNodeColor(node.depth))
        graphology.setNodeAttribute(nodeId, 'size', size)
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
    if (nodesAdded && rootId) {
      applyLayout(graphology, rootId)
      animateFadeIn(graphology, sigma)
    }

    // On first load: center camera on the root node
    if (previousNodeCount === 0 && graphology.order > 0) {
      sigma.getCamera().animatedReset({ duration: 600 })
    }

    sigma.refresh()
  }, [graphState])

  // Animate layout transition when the user switches between tree and radial modes
  useEffect(() => {
    const graphology = graphologyRef.current
    const sigma = sigmaRef.current
    const rootId = useGraphStore.getState().graph.rootId
    if (!graphology || !sigma || !rootId || graphology.order === 0) return

    animateLayoutTransition(graphology, sigma, rootId)
    sigma.getCamera().animatedReset({ duration: 600 })
  }, [layoutMode])

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
      style={{ background: '#ffffff' }}
    />
  )
}
