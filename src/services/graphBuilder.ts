import { getSampleRelationships } from './whosampled'
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

async function expandNode(
  trackId: string,
  currentDepth: number,
  maxDepth: number,
  semaphore: Semaphore,
  visited: Set<string>
): Promise<void> {
  const store = useGraphStore.getState()

  if (currentDepth >= maxDepth) return
  if (store.graph.nodeCount >= NODE_CAP) return
  if (visited.has(trackId)) return
  visited.add(trackId)

  store.setNodeLoading(trackId, true)

  await semaphore.acquire()
  let relationships: { sampledIn: Track[]; sampledFrom: Track[] }
  try {
    relationships = await getSampleRelationships(trackId)
  } catch (error: unknown) {
    store.setNodeExpanded(trackId)

    // 404: silent
    if (axios404(error)) return

    // 429: retry once after 2s
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

  // Refresh store state after async gap
  const freshStore = useGraphStore.getState()
  const remaining = NODE_CAP - freshStore.graph.nodeCount

  const newNodes: GraphNode[] = [
    ...relationships.sampledIn
      .filter((track) => !freshStore.graph.nodes.has(track.id))
      .map((track) => ({
        ...track,
        depth: currentDepth + 1,
        isRoot: false,
        isExpanded: false,
        isLoading: false,
      })),
    ...relationships.sampledFrom
      .filter((track) => !freshStore.graph.nodes.has(track.id))
      .map((track) => ({
        ...track,
        depth: currentDepth + 1,
        isRoot: false,
        isExpanded: false,
        isLoading: false,
      })),
  ].slice(0, remaining)

  const newEdges: SampleEdge[] = [
    ...relationships.sampledIn.map((track) => ({
      id: `${track.id}-->${trackId}`,
      sourceId: track.id,
      targetId: trackId,
    })),
    ...relationships.sampledFrom.map((track) => ({
      id: `${trackId}-->${track.id}`,
      sourceId: trackId,
      targetId: track.id,
    })),
  ]

  useGraphStore.getState().addNodes(newNodes, newEdges)
  useGraphStore.getState().setNodeExpanded(trackId)

  // Recurse breadth-first
  await Promise.all(
    newNodes.map((node) =>
      expandNode(node.id, currentDepth + 1, maxDepth, semaphore, visited)
    )
  )
}

export async function buildGraphFromRoot(track: Track, maxDepth: number): Promise<void> {
  const store = useGraphStore.getState()
  store.setRoot(track)
  store.setIsBuilding(true)

  const semaphore = new Semaphore(MAX_CONCURRENT)
  const visited = new Set<string>()

  try {
    await expandNode(track.id, 0, maxDepth, semaphore, visited)
  } finally {
    useGraphStore.getState().setIsBuilding(false)
  }
}

export async function rebuildFromRoot(): Promise<void> {
  const store = useGraphStore.getState()
  if (!store.graph.rootId) return

  const rootNode = store.graph.nodes.get(store.graph.rootId)
  if (!rootNode) return

  const maxDepth = store.graph.maxDepth
  store.resetGraph()
  store.setRoot(rootNode)
  store.setIsBuilding(true)

  const semaphore = new Semaphore(MAX_CONCURRENT)
  const visited = new Set<string>()

  try {
    await expandNode(rootNode.id, 0, maxDepth, semaphore, visited)
  } finally {
    useGraphStore.getState().setIsBuilding(false)
  }
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
