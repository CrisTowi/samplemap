import type { Track } from '../types'

// Full implementation in Phase 2
export async function search(_query: string): Promise<Track[]> {
  return []
}

export async function getSampleRelationships(_trackId: string): Promise<{
  sampledIn: Track[];
  sampledFrom: Track[];
}> {
  return { sampledIn: [], sampledFrom: [] }
}
