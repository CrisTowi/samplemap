export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  year?: number;
  genre?: string;
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
  direction?: 'sampled_from' | 'sampled_in';
}

export interface GraphNode extends Track {
  depth: number;
  isRoot: boolean;
  isExpanded: boolean;
  isLoading: boolean;
  parentId?: string;
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
  genre?: string;
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
  removeNodes: (nodeIds: string[]) => void;
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

  previewTrack: Track | null;
  setPreviewTrack: (track: Track | null) => void;

  selectedNodeId: string | null;
  setSelectedNode: (id: string | null) => void;

  layoutMode: 'tree' | 'radial';
  setLayoutMode: (mode: 'tree' | 'radial') => void;

  isBuilding: boolean;
  setIsBuilding: (value: boolean) => void;

  toasts: Toast[];
  addToast: (message: string) => void;
  dismissToast: (id: string) => void;

  isPanelMinimized: boolean;
  setIsPanelMinimized: (value: boolean) => void;
  pendingNodeId: string | null;
  setPendingNodeId: (id: string | null) => void;
}
