export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  year?: number;
  coverArt?: string;
  youtubeUrl?: string;
  spotifyUrl?: string;
  geniusUrl?: string;
  producers?: string[];
  featuredArtists?: string[];
  description?: string;
  pageviews?: number;
  sampleCount: {
    sampledIn: number;
    sampledFrom: number;
  };
}

export interface SampleEdge {
  id: string;
  sourceId: string;
  targetId: string;
  sampleType?: 'interpolation' | 'replay' | 'direct';
}

export interface GraphNode extends Track {
  depth: number;
  isRoot: boolean;
  isExpanded: boolean;
  isLoading: boolean;
}

export interface GraphState {
  nodes: Map<string, GraphNode>;
  edges: Map<string, SampleEdge>;
  rootId: string | null;
  maxDepth: number;
  nodeCount: number;
  isCapped: boolean;
}

export interface TrackMeta {
  geniusUrl?: string;
  youtubeUrl?: string;
  spotifyUrl?: string;
  producers?: string[];
  featuredArtists?: string[];
  description?: string;
  pageviews?: number;
  sampleCount: { sampledIn: number; sampledFrom: number };
}

export interface SampleCacheEntry {
  sampledIn: Track[];
  sampledFrom: Track[];
  trackMeta?: TrackMeta;
}

export interface ApiCache {
  search: Map<string, Track[]>;
  samples: Map<string, SampleCacheEntry>;
  youtube: Map<string, string>;
  spotify: Map<string, string | null>;
}

export interface Toast {
  id: string;
  message: string;
}

export interface AppStore {
  graph: GraphState;
  setRoot: (track: Track) => void;
  addNodes: (nodes: GraphNode[], edges: SampleEdge[]) => void;
  setNodeLoading: (id: string, loading: boolean) => void;
  setNodeExpanded: (id: string, update?: Partial<Pick<Track, 'sampleCount' | 'youtubeUrl' | 'spotifyUrl' | 'geniusUrl' | 'producers' | 'featuredArtists' | 'description' | 'pageviews'>>) => void;
  setMaxDepth: (depth: number) => void;
  resetGraph: () => void;

  cache: ApiCache;
  setCacheEntry: <K extends keyof ApiCache>(
    store: K,
    key: string,
    value: ApiCache[K] extends Map<string, infer V> ? V : never
  ) => void;

  selectedNodeId: string | null;
  setSelectedNode: (id: string | null) => void;

  isBuilding: boolean;
  setIsBuilding: (value: boolean) => void;

  toasts: Toast[];
  addToast: (message: string) => void;
  dismissToast: (id: string) => void;
}
