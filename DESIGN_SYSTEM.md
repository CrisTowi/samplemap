# SampleMap Design System

Figma file: https://www.figma.com/design/6au9RLwiBiyu34zQCvrC4z/Untitled

**Before implementing or modifying any UI component, check the relevant section below.**
All states, tokens, and visual rules are sourced directly from Figma node definitions.

---

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `Text/Base/Primary` | `#2a2d2d` | Headings, input text, labels |
| `Text/Base/Secondary` | `#676e6f` | Artist name, year, subtitles |
| `Text/Base/Tertiary` | `#9ca4a4` | Placeholders, muted labels (e.g. "searching...") |
| `Brand/Obscure` | `#1b2211` | Dividers, borders, dots |
| `Elements/Dividers/Obscure` | `#1b2211` | Horizontal rule lines |
| `Elements/Icons/Obscure` | `#1b2211` | Icon fills |
| `Background/Neutral/Cool` | `#fbffe5` | Hover state background (Song, SeeResults hover) |
| `Background/Accents/Joy` | `#f4ffc8` | Pressed state background (SeeResults pressed) |
| `Stroke/Thin` | `1px` | Border widths (album art circles) |
| `Border/Base` | `4px` | Top padding on Song rows |
| `Border/Medium` | `8px` | Horizontal padding, gap between album art and text |
| `Border/Large` | `16px` | — |
| `Border/Massive` | `9999px` | Full pill/circle rounding |
| `Size/XS` | `8px` | Gap between elements within Song |
| `Size/S` | `12px` | — |
| `Size/XL` | `32px` | — |
| `Size/4XL` | `56px` | — |

### Typography

| Token | Family | Weight | Size | Line Height | Letter Spacing |
|-------|--------|--------|------|-------------|----------------|
| `font-size/S` | — | — | 14px | — | — |
| `font-size/M` | — | — | 16px | — | — |
| `font-size/L` | — | — | 18px | — | — |
| `font-size/2XL` | — | — | 24px | — | — |
| `font-weight/Regular` | — | 400 | — | — | — |
| `Desktop/Medium` | Rethink Sans | 400 | 18px (`L`) | 22px | -2 (letter-spacing) |

### Font families in use

| Family | Weights loaded | Usage |
|--------|---------------|-------|
| IBM Plex Mono | 400, 500 | Labels, status text, "See Results", footer |
| Rethink Sans | 400 | Search input text |
| Inter | 400 | Song titles, artist names, year |

---

## Components

### Song row
**Figma node:** `2:90` (Default) / `2:146` (Hover)
**Component set:** `2:145`

**Props:**
- `album: boolean` — show circular album art (default: true)
- `detail: boolean` — show year on right (default: true)
- `icon: boolean` — show arrow icon on right (default: false)
- `state: "Default" | "Hover"`

**States:**

| State | Background | Font weight |
|-------|-----------|-------------|
| Default | transparent | Regular 400 |
| Hover | `#fbffe5` (`Background/Neutral/Cool`) | Regular 400 |

**Layout (w=345px):**
- Container: `flex-col`, `gap-8px` (`Size/XS`), `pt-4px` (`Border/Base`), `px-8px` (`Border/Medium`)
- Row: `flex`, `gap-8px` (`Border/Medium`), `items-center`
  - Album art: `42×42px`, `rounded-full`, `border-1px #1b2211`
  - Text column: `flex-1`, `gap-2px`
    - Title: Inter 400, 18px, `#2a2d2d`, tracking -0.36px
    - Artist: Inter 400, 14px, `#676e6f`, tracking -0.28px
  - Year (if `detail`): Inter 400, 14px, `#676e6f`, tracking -0.28px, right-aligned
- Divider: `1px #1b2211`, full width, at bottom of row

**CSS implementation:**
```tsx
// Default
<div className="flex flex-col gap-[8px] pt-[4px] px-[8px] w-[345px]">
  <div className="flex items-center gap-[8px]">
    <div className="shrink-0 size-[42px] rounded-full overflow-hidden border border-[#1b2211]" />
    <div className="flex flex-1 flex-col gap-[2px]">
      <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[#2a2d2d] text-[18px] leading-[22px] tracking-[-0.36px]" />
      <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[#676e6f] text-[14px] leading-[22px] tracking-[-0.28px]" />
    </div>
    <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[#676e6f] text-[14px] leading-[22px] tracking-[-0.28px]" />
  </div>
  <div className="w-full h-px bg-[#1b2211]" />
</div>

// Hover: add bg-[#fbffe5] to container
```

---

### See Results
**Figma node:** `2:164` (Active/Base)
**Component set:** `2:166`

**Props:**
- `size: "Base" | "Small"`
- `state: "Active" | "Hover" | "Pressed"`

**States × Sizes:**

| State | Size | Background | Font weight | Font size | Letter spacing |
|-------|------|-----------|-------------|-----------|----------------|
| Active | Base | transparent | Regular 400 | 16px | -0.32px |
| Active | Small | transparent | Regular 400 | 14px | -0.28px |
| Hover | Base | `#fbffe5` (`Background/Neutral/Cool`) | Medium 500 | 16px | -0.32px |
| Hover | Small | `#fbffe5` | Medium 500 | 14px | -0.28px |
| Pressed | Base | `#f4ffc8` (`Background/Accents/Joy`) | Medium 500 | 16px | -0.32px |
| Pressed | Small | `#f4ffc8` | Medium 500 | 14px | -0.28px |

**Typography:** IBM Plex Mono, underlined, `#2a2d2d`

**CSS implementation (Base size):**
```tsx
<button
  className="flex items-center justify-center px-2 py-1
    font-normal text-[#2a2d2d] text-[16px] leading-[18px] tracking-[-0.32px] underline decoration-solid
    hover:font-medium hover:bg-[#fbffe5]
    active:font-medium active:bg-[#f4ffc8]
    transition-colors"
  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
>
  See Results
</button>
```

---

### Divider
**Figma node:** `1:26`

**Variants:** `Base` | `Bold` | `Light`  
**Default:** `Base` — 1px line, color `#1b2211` (`Elements/Dividers/Obscure`), full width

**CSS implementation:**
```tsx
<div className="w-full h-px bg-[#1b2211]" />
```

---

### Album (art)
**Figma node:** `2:86` (Avatar/Default/List)
**Component set:** `2:179`

**Props:**
- `size: "Avatar" | "Detail"` — Avatar=42px, Detail=180px
- `type: "List" | "Node" | "Uncovered"` — List=circle, Uncovered=28px circle
- `state: "Default" | "Hover"`

**States:**

| State | Visual change |
|-------|--------------|
| Default | Standard display |
| Hover | (subtle — no background change on album itself) |

**Sizes:**

| Size | Dimensions | Border radius |
|------|-----------|---------------|
| Avatar / List | 42×42px | `9999px` (full circle) |
| Avatar / Uncovered | 28×28px | `9999px` |
| Detail / Node | 180×180px | `9999px` |

**All variants:** `border-1px #1b2211`, `object-cover`

---

### Logo
**Figma node:** `2:23` — symbols child: `2:17` (SVG, 43×13px)

Three circles **decreasing in size left→right**, all filled `#1B2211` (`Brand/Obscure`):

| Circle | cx | cy | r | diameter |
|--------|----|----|---|----------|
| Left   | 6.5 | 6.5 | 6.5 | 13px |
| Middle | 23.5 | 6.5 | 5.5 | 11px |
| Right  | 38.5 | 6.5 | 4.5 | 9px |

**Typography:** IBM Plex Mono 400, 14px, `#2a2d2d`, tracking -0.28px, line-height 22px

**CSS implementation:**
```tsx
<div className="flex flex-col items-center gap-3">
  <svg width="43" height="13" viewBox="0 0 43 13" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="6.5" cy="6.5" r="6.5" fill="#1B2211" />
    <circle cx="23.5" cy="6.5" r="5.5" fill="#1B2211" />
    <circle cx="38.5" cy="6.5" r="4.5" fill="#1B2211" />
  </svg>
  <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        className="text-[14px] leading-[22px] text-[#2a2d2d] tracking-[-0.28px]">
    Node Record
  </span>
</div>
```

### Search input — font rules
The input has two distinct font states (cannot use a single font-family):
- **Placeholder** ("Search song"): IBM Plex Mono 400, color `#9ca4a4` (`Text/Base/Tertiary`) — set via `::placeholder` CSS
- **Typed text**: Rethink Sans 400, color `#2a2d2d` (`Text/Base/Primary`) — set via inline `style`

Both: 18px (`font-size/L`), line-height 22px, tracking -0.36px

---

## Screen layouts

| Frame | Node ID | Component | Description |
|-------|---------|-----------|-------------|
| Idle / empty search | `1:2` | `SearchPage` | "Search song" placeholder, "find the node" subtitle |
| Typing / searching | `1:94` | `SearchPage` | Query text + cursor, "searching...", pulsing dot |
| Search results | `1:141` | `SearchPage` | 5 song rows, "N nodes" count, "See Results" |
| **Node preview** | **`2:551`** | **`NodePreviewPage`** | **Intermediate: selected song + top sample connection** |
| Results + map view | `1:246` | (future) | Graph view with album art nodes |

### NodePreviewPage layout (`2:551`)

**App state:** `previewTrack` set in store, `rootId` still null. Appears after song selection, before full graph build.

**Layout positions** (relative to 1512×982 viewport):

| Element | Left | Top | Size | Notes |
|---------|------|-----|------|-------|
| "New search" button | `44px` | `32px` | — | SeeResults/Small/Active states |
| Logo | `50% center` | `32px` | 43×13 SVG | Same as SearchPage |
| Artist label | `21.7%` | `19.5%` | — | "Artist" + artist name (24px) |
| Main album circle | `18.2%` | `26.4%` | 180×180px | Album/Detail/Node — rounded-full, border-1px #1b2211 |
| Connecting line | `calc(18.2% + 180px)` | `calc(50% - 145px)` | to `right: 37%` | 1px #1b2211, same y as search divider |
| Root song info row | `12.8%` | `45.5%` | w=345px | No album art; title + artist + year + arrow icon |
| Center cluster | `50% center` | `calc(50% - 133px)` | — | 3 blurred 28px circles + "discover N nodes" link |
| "popular node song" | `63%` | `29.6%` | — | IBM Plex Mono, secondary color, above right song |
| Top sample song row | `63%` | `29.6% + label` | w=345px | Regular Song row with album + title + artist + year + arrow |
| Footer | `50% center` | `bottom: 52px` | — | "2026, Powered by" |

**Data:**
- `rootTrack` — the selected song from SearchPage
- `topSample` — fetched from `getSampleRelationships`, sorted by pageviews + sampleCount, first result
- `previewTracks[0..2]` — next 3 tracks for blurred circles
- `nodeCount` — initially `sampleCount.sampledIn + sampleCount.sampledFrom`, updated after fetch

**"discover N nodes"** — calls `buildGraphFromRoot(rootTrack, maxDepth)` which sets `rootId` → transitions to graph view.
**"New search"** — calls `setPreviewTrack(null)` → back to SearchPage.
