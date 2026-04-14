import { useEffect, useRef } from 'react'
import Graph from 'graphology'
import Sigma from 'sigma'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import { useGraphStore } from '../store/graphStore'
import { drawDarkLabel, drawDarkNodeHover } from './graphHelpers'

const NODE_COLORS = {
  root: '#7F77DD',
  depth1: '#1D9E75',
  depthN: '#888780',
}

const MAX_NODE_SIZE = 28
const BASE_NODE_SIZE = 8

function computeNodeSize(connections: number): number {
  return Math.min(BASE_NODE_SIZE + connections * 2, MAX_NODE_SIZE)
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

  // Initialize Sigma once on mount
  useEffect(() => {
    if (!containerRef.current) return

    const graphology = new Graph({ type: 'directed', multi: false })
    graphologyRef.current = graphology

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

    sigma.on('clickNode', ({ node }) => {
      setSelectedNode(node)
    })

    sigma.on('clickStage', () => {
      setSelectedNode(null)
    })

    return () => {
      sigma.kill()
      sigmaRef.current = null
      graphologyRef.current = null
    }
  }, [setSelectedNode])

  // Sync Zustand graph state → Graphology graph → Sigma
  useEffect(() => {
    const graphology = graphologyRef.current
    if (!graphology) return

    // Add missing nodes
    for (const [nodeId, node] of graphState.nodes) {
      const connections = node.sampleCount.sampledIn + node.sampleCount.sampledFrom
      if (!graphology.hasNode(nodeId)) {
        graphology.addNode(nodeId, {
          label: `${node.artist} – ${node.title}`,
          size: computeNodeSize(connections),
          color: getNodeColor(node.depth),
          x: Math.random() * 10,
          y: Math.random() * 10,
        })
      } else {
        // Update mutable attributes (e.g. loading state color later)
        graphology.setNodeAttribute(nodeId, 'color', getNodeColor(node.depth))
        graphology.setNodeAttribute(nodeId, 'size', computeNodeSize(connections))
      }
    }

    // Remove nodes no longer in state
    for (const nodeId of graphology.nodes()) {
      if (!graphState.nodes.has(nodeId)) {
        graphology.dropNode(nodeId)
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

    // Run ForceAtlas2 briefly to settle layout when nodes > 1
    if (graphology.order > 1) {
      forceAtlas2.assign(graphology, {
        iterations: 100,
        settings: {
          gravity: 1,
          scalingRatio: 10,
          slowDown: 5,
          barnesHutOptimize: graphology.order > 50,
        },
      })
    }

    sigmaRef.current?.refresh()
  }, [graphState])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: '#1a1a1e' }}
    />
  )
}
