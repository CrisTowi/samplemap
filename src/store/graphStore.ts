import { create } from 'zustand'
import type { Track, GraphNode, SampleEdge, GraphState, ApiCache, AppStore, Toast } from '../types'

const NODE_CAP = 150


function emptyGraphState(): GraphState {
  return {
    nodes: new Map(),
    edges: new Map(),
    rootId: null,
    maxDepth: 1,
    nodeCount: 0,
    isCapped: false,
  }
}

function emptyCache(): ApiCache {
  return {
    search: new Map(),
    samples: new Map(),
    youtube: new Map(),
    spotify: new Map(),
  }
}

export const useGraphStore = create<AppStore>((set) => ({
  graph: emptyGraphState(),

  setRoot: (track: Track) => {
    set((state) => {
      const rootNode: GraphNode = {
        ...track,
        depth: 0,
        isRoot: true,
        isExpanded: false,
        isLoading: false,
      }
      const nodes = new Map<string, GraphNode>([[track.id, rootNode]])
      return {
        graph: {
          ...state.graph,
          nodes,
          edges: new Map(),
          rootId: track.id,
          nodeCount: 1,
          isCapped: false,
        },
      }
    })
  },

  addNodes: (nodes: GraphNode[], edges: SampleEdge[]) => {
    set((state) => {
      const updatedNodes = new Map(state.graph.nodes)
      const updatedEdges = new Map(state.graph.edges)
      let count = updatedNodes.size
      let capped = state.graph.isCapped

      for (const node of nodes) {
        if (count >= NODE_CAP) {
          capped = true
          break
        }
        if (!updatedNodes.has(node.id)) {
          updatedNodes.set(node.id, node)
          count++
        }
      }

      for (const edge of edges) {
        if (!updatedEdges.has(edge.id)) {
          updatedEdges.set(edge.id, edge)
        }
      }

      return {
        graph: {
          ...state.graph,
          nodes: updatedNodes,
          edges: updatedEdges,
          nodeCount: updatedNodes.size,
          isCapped: capped,
        },
      }
    })
  },

  removeNodes: (nodeIds: string[]) => {
    const toRemove = new Set(nodeIds)
    set((state) => {
      const nodes = new Map(state.graph.nodes)
      const edges = new Map(state.graph.edges)
      for (const id of toRemove) nodes.delete(id)
      for (const [edgeId, edge] of edges) {
        if (toRemove.has(edge.sourceId) || toRemove.has(edge.targetId)) {
          edges.delete(edgeId)
        }
      }
      return { graph: { ...state.graph, nodes, edges, nodeCount: nodes.size } }
    })
  },

  setNodeLoading: (id: string, loading: boolean) => {
    set((state) => {
      const nodes = new Map(state.graph.nodes)
      const node = nodes.get(id)
      if (node) {
        nodes.set(id, { ...node, isLoading: loading })
      }
      return { graph: { ...state.graph, nodes } }
    })
  },

  setNodeExpanded: (id, update) => {
    set((state) => {
      const nodes = new Map(state.graph.nodes)
      const node = nodes.get(id)
      if (node) {
        nodes.set(id, { ...node, isExpanded: true, isLoading: false, ...update })
      }
      return { graph: { ...state.graph, nodes } }
    })
  },

  setMaxDepth: (depth: number) => {
    set((state) => ({
      graph: { ...state.graph, maxDepth: depth },
    }))
  },

  resetGraph: () => {
    set({ graph: emptyGraphState() })
  },

  cache: emptyCache(),

  setCacheEntry: (store, key, value) => {
    set((state) => {
      const updatedMap = new Map(state.cache[store] as Map<string, unknown>)
      updatedMap.set(key, value)
      return {
        cache: {
          ...state.cache,
          [store]: updatedMap,
        },
      }
    })
  },

  previewTrack: null,
  setPreviewTrack: (track) => set({ previewTrack: track }),

  selectedNodeId: null,
  setSelectedNode: (id: string | null) => set({ selectedNodeId: id }),

  layoutMode: 'tree' as const,
  setLayoutMode: (mode: 'tree' | 'radial') => set({ layoutMode: mode }),

  isBuilding: false,
  setIsBuilding: (value: boolean) => set({ isBuilding: value }),

  toasts: [] as Toast[],
  addToast: (message: string) => {
    const id = `${Date.now()}-${Math.random()}`
    set((state) => ({ toasts: [...state.toasts, { id, message }] }))
  },
  dismissToast: (id: string) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),

  isPanelMinimized: false,
  setIsPanelMinimized: (value) => set({ isPanelMinimized: value }),

  pendingNodeId: null as string | null,
  setPendingNodeId: (id) => set({ pendingNodeId: id }),

}))
