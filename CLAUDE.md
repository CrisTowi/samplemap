# SampleMap — Claude Instructions

## Design System

**Before implementing or modifying any UI component, read `DESIGN_SYSTEM.md` first.**

It contains:
- All Figma design tokens (colors, spacing, typography, border radii)
- Every component's states, props, and exact CSS implementation
- Screen layout node IDs for referencing frames in Figma

When the user provides a Figma URL or node ID, use the MCP Figma tools to fetch its design context, then update `DESIGN_SYSTEM.md` with the new component specs before writing any code.

## Active branch

Current redesign work lives on `redesign/search-entrypoint`. Do not commit or push until the user confirms everything works.

## Project structure

```
src/
  components/
    SearchPage.tsx   ← new redesign entrypoint (Step 1)
    SearchBar.tsx    ← used in graph view header only
    GraphCanvas.tsx  ← Sigma.js visualization
    InfoPanel.tsx    ← right sidebar / mobile drawer
  services/
    whosampled.ts    ← primary search API
    genius.ts        ← fallback + metadata
    spotify.ts       ← track resolution
    youtube.ts       ← video title resolution
  store/
    graphStore.ts    ← Zustand state
  types/index.ts
```

## Tech stack

- React 19, TypeScript, Vite
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- Sigma.js + Graphology (graph visualization)
- Zustand (state)
- Google Fonts: IBM Plex Mono (400, 500), Rethink Sans (400), Inter (400)
