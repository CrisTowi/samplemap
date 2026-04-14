import { create } from 'zustand'
import type { Track, GraphNode, SampleEdge, GraphState, ApiCache, AppStore, Toast } from '../types'

const NODE_CAP = 150

const LS_KEYS = {
  whosampled: 'sc_whosampled_key',
  youtube: 'sc_youtube_key',
  spotifyClientId: 'sc_spotify_client_id',
  spotifyClientSecret: 'sc_spotify_client_secret',
} as const

function loadApiKeys(): AppStore['apiKeys'] {
  return {
    whosampled: localStorage.getItem(LS_KEYS.whosampled) ?? '',
    youtube: localStorage.getItem(LS_KEYS.youtube) ?? '',
    spotifyClientId: localStorage.getItem(LS_KEYS.spotifyClientId) ?? '',
    spotifyClientSecret: localStorage.getItem(LS_KEYS.spotifyClientSecret) ?? '',
  }
}

function emptyGraphState(): GraphState {
  return {
    nodes: new Map(),
    edges: new Map(),
    rootId: null,
    maxDepth: 2,
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

export const useGraphStore = create<AppStore>((set, get) => ({
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

  setNodeExpanded: (id: string) => {
    set((state) => {
      const nodes = new Map(state.graph.nodes)
      const node = nodes.get(id)
      if (node) {
        nodes.set(id, { ...node, isExpanded: true, isLoading: false })
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

  selectedNodeId: null,
  setSelectedNode: (id: string | null) => set({ selectedNodeId: id }),

  settingsOpen: false,
  toggleSettings: () => set((state) => ({ settingsOpen: !state.settingsOpen })),

  isBuilding: false,
  setIsBuilding: (value: boolean) => set({ isBuilding: value }),

  toasts: [] as Toast[],
  addToast: (message: string) => {
    const id = `${Date.now()}-${Math.random()}`
    set((state) => ({ toasts: [...state.toasts, { id, message }] }))
  },
  dismissToast: (id: string) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),

  apiKeys: loadApiKeys(),
  setApiKey: (key, value) => {
    const lsKey = LS_KEYS[key]
    localStorage.setItem(lsKey, value)
    set((state) => ({
      apiKeys: { ...state.apiKeys, [key]: value },
    }))
    void get
  },
}))
