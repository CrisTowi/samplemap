# SampleMap

An interactive graph explorer for musical sample relationships. Search any song and discover which tracks it sampled — and which tracks sampled it — across multiple degrees of separation.

![SampleMap graph explorer](https://placehold.co/1200x630/1a1a1e/7F77DD?text=SampleMap)

## Features

- **Interactive graph** — force-directed layout, zoomable, pannable, draggable nodes
- **Depth control** — explore 1–4 levels deep
- **Node info panel** — cover art, sample counts, YouTube and Spotify links
- **URL paste** — paste a YouTube or Spotify URL to start from that track
- **Expand from here** — re-root the graph at any node
- **Export** — download the graph as a PNG
- **Responsive** — works on mobile (info panel as bottom drawer)

## Data Sources

| Source | Status | Notes |
|---|---|---|
| **WhoSampled API** | Requires API key | Most comprehensive; [apply here](https://www.whosampled.com/api/) |
| **MusicBrainz** | Free, no key needed | Automatic fallback when no WhoSampled key is set |
| **YouTube Data API v3** | Optional | Required for "Play on YouTube" direct links |
| **Spotify Web API** | Optional | Required for "Open on Spotify" links |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)

### Setup

```bash
git clone https://github.com/yourname/samplemap.git
cd samplemap
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

The app works out of the box using **MusicBrainz** — no API keys needed to get started.

### Mock data mode

For development without any API calls:

```bash
# .env.local
VITE_USE_MOCK_DATA=true
```

Restart the dev server. Includes a rich dataset of 50+ tracks across 5 sample lineages (Amen Break, Funky Drummer, Think, Apache, Good Times).

### API Keys

All keys are entered at runtime via the **Settings panel** (gear icon). They are stored in `localStorage` — never committed to the repo.

#### WhoSampled (most comprehensive data)

1. Apply at [whosampled.com/api](https://www.whosampled.com/api/) or email `developer@whosampled.com`
2. Once approved, open Settings and paste your key under **WhoSampled**

#### YouTube Data API v3 (play links)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/library/youtube.googleapis.com)
2. Enable the YouTube Data API v3
3. Create an API key under **Credentials**
4. Open Settings and paste it under **YouTube Data API v3**

> Free tier: 10,000 units/day. Each search costs 100 units. YouTube lookups only fire on node click — not during graph building — to preserve quota.

#### Spotify (optional secondary links)

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create an app → copy the **Client ID** and **Client Secret**
3. Open Settings and paste both fields

## Deployment

### Netlify (recommended)

1. Push this repo to GitHub
2. Connect to [Netlify](https://netlify.com) → **New site from Git**
3. Build command: `pnpm run build` · Publish directory: `dist`

`netlify.toml` is already configured.

### Other platforms

```bash
pnpm build       # outputs to dist/
pnpm preview     # preview the production build locally
```

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Vite + React + TypeScript |
| Graph rendering | Sigma.js + Graphology |
| Layout | graphology-layout-forceatlas2 |
| Styling | Tailwind CSS |
| State | Zustand |
| HTTP | Axios |

## License

MIT
