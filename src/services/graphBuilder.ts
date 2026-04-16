import { getSampleRelationships } from './whosampled'
import type { SampleRelationshipsResult } from './whosampled'
import { useGraphStore } from '../store/graphStore'
import type { Track, GraphNode, SampleEdge } from '../types'

const NODE_CAP = 150
const MAX_CONCURRENT = 5

class Semaphore {
  private count: number
  private queue: (() => void)[]

  constructor(max: number) {
    this.count = max
    this.queue = []
  }

  async acquire(): Promise<void> {
    if (this.count > 0) {
      this.count--
      return
    }
    return new Promise((resolve) => {
      this.queue.push(resolve)
    })
  }

  release(): void {
    this.count++
    const next = this.queue.shift()
    if (next) {
      this.count--
      next()
    }
  }
}

async function fetchAndAddChildren(
  trackId: string,
  parentDepth: number,
  semaphore: Semaphore
): Promise<void> {
  const store = useGraphStore.getState()

  if (store.graph.nodeCount >= NODE_CAP) return

  store.setNodeLoading(trackId, true)

  await semaphore.acquire()
  let relationships: SampleRelationshipsResult
  try {
    relationships = await getSampleRelationships(trackId)
  } catch (error: unknown) {
    store.setNodeExpanded(trackId)

    if (axios404(error)) return

    if (axios429(error)) {
      await delay(2000)
      try {
        relationships = await getSampleRelationships(trackId)
      } catch {
        showToast('Rate limit hit — some nodes skipped')
        return
      }
    } else {
      showToast('Connection error — some nodes could not be loaded')
      return
    }
  } finally {
    semaphore.release()
  }

  const freshStore = useGraphStore.getState()
  const remaining = NODE_CAP - freshStore.graph.nodeCount
  const childDepth = parentDepth + 1

  // Build a fingerprint → existing nodeId map to catch same-song / different-ID duplicates
  const fingerprints = new Map<string, string>()
  for (const [existingId, existingNode] of freshStore.graph.nodes) {
    const fp = `${existingNode.artist.toLowerCase().trim()}__${existingNode.title.toLowerCase().trim()}`
    fingerprints.set(fp, existingId)
  }

  function resolveExistingId(track: Track): string | null {
    if (freshStore.graph.nodes.has(track.id)) return track.id
    const fp = `${track.artist.toLowerCase().trim()}__${track.title.toLowerCase().trim()}`
    return fingerprints.get(fp) ?? null
  }

  const newNodes: GraphNode[] = [
    ...relationships.sampledIn
      .filter((track) => resolveExistingId(track) === null)
      .map((track) => ({
        ...track,
        depth: childDepth,
        isRoot: false,
        isExpanded: false,
        isLoading: false,
        parentId: trackId,
      })),
    ...relationships.sampledFrom
      .filter((track) => resolveExistingId(track) === null)
      .map((track) => ({
        ...track,
        depth: childDepth,
        isRoot: false,
        isExpanded: false,
        isLoading: false,
        parentId: trackId,
      })),
  ].slice(0, remaining)

  const newEdges: SampleEdge[] = [
    ...relationships.sampledIn.map((track) => {
      const resolvedId = resolveExistingId(track) ?? track.id
      return {
        id: `${resolvedId}-->${trackId}`,
        sourceId: resolvedId,
        targetId: trackId,
        direction: 'sampled_in' as const,
      }
    }),
    ...relationships.sampledFrom.map((track) => {
      const resolvedId = resolveExistingId(track) ?? track.id
      return {
        id: `${trackId}-->${resolvedId}`,
        sourceId: trackId,
        targetId: resolvedId,
        direction: 'sampled_from' as const,
      }
    }),
  ]

  useGraphStore.getState().addNodes(newNodes, newEdges)
  useGraphStore.getState().setNodeExpanded(trackId, {
    sampleCount: {
      sampledIn: relationships.sampledIn.length,
      sampledFrom: relationships.sampledFrom.length,
    },
    ...relationships.trackMeta,
  })
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Set a new root and immediately fetch its depth-1 samples.
 * The graph always starts with root + direct samples visible.
 */
export async function buildGraphFromRoot(track: Track): Promise<void> {
  const store = useGraphStore.getState()
  store.setRoot(track)
  store.setIsBuilding(true)

  const semaphore = new Semaphore(MAX_CONCURRENT)

  try {
    await fetchAndAddChildren(track.id, 0, semaphore)
  } finally {
    useGraphStore.getState().setIsBuilding(false)
  }
}

/**
 * Expand a single node on click: fetch its children and add them to the graph.
 */
export async function expandNodeOnClick(trackId: string): Promise<void> {
  const store = useGraphStore.getState()
  const node = store.graph.nodes.get(trackId)
  if (!node || node.isExpanded || node.isLoading) return

  store.setIsBuilding(true)
  const semaphore = new Semaphore(MAX_CONCURRENT)

  try {
    await fetchAndAddChildren(trackId, node.depth, semaphore)
  } finally {
    useGraphStore.getState().setIsBuilding(false)
  }
}

/**
 * Collapse a node: remove all its descendants (tracked via parentId) and
 * mark the node itself as unexpanded.
 */
export function collapseNode(trackId: string): void {
  const store = useGraphStore.getState()

  // BFS over parentId links to collect all descendants
  const visited = new Set<string>([trackId])
  const toRemove: string[] = []
  const queue: string[] = [trackId]

  while (queue.length > 0) {
    const currentId = queue.shift()!
    for (const [nodeId, node] of store.graph.nodes) {
      if (node.parentId === currentId && !visited.has(nodeId)) {
        visited.add(nodeId)
        toRemove.push(nodeId)
        queue.push(nodeId)
      }
    }
  }

  if (toRemove.length > 0) {
    store.removeNodes(toRemove)
  }

  // Mark the collapsed node as unexpanded
  useGraphStore.setState((state) => {
    const nodes = new Map(state.graph.nodes)
    const node = nodes.get(trackId)
    if (node) nodes.set(trackId, { ...node, isExpanded: false, isLoading: false })
    return { graph: { ...state.graph, nodes } }
  })
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function axios404(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response: { status: number } }).response?.status === 404
  )
}

function axios429(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response: { status: number } }).response?.status === 429
  )
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function showToast(message: string): void {
  useGraphStore.getState().addToast(message)
}
