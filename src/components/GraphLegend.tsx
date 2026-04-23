import { useState } from 'react'
import { EDGE_COLORS } from './graphHelpers'

const FONT_MONO = "'IBM Plex Mono', monospace"

const SIZE_STEPS = [
  { r: 5, label: 'niche' },
  { r: 9, label: '' },
  { r: 14, label: 'popular' },
]

const COLOR_STEPS = [
  { color: '#1b2211', label: 'root' },
  { color: '#1D9E75', label: 'depth 1' },
  { color: '#9ca4a4', label: 'depth 2+' },
]

const EDGE_STEPS = [
  { color: EDGE_COLORS.sampled_from.bright, label: 'sampled from' },
  { color: EDGE_COLORS.sampled_in.bright,   label: 'sampled in' },
]

const CANVAS_HEIGHT = 30
const CANVAS_WIDTH = 74

export default function GraphLegend() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="relative flex flex-col items-stretch min-w-[168px]">

      {/* Expanded body — grows upward */}
      {expanded && (
        <div className="absolute bottom-full mb-2 left-0 right-0 flex flex-col gap-3 bg-white border border-[#1b2211] rounded-xl px-4 py-3">

          {/* Node size */}
          <div className="flex flex-col gap-1.5">
            <span
              className="text-[#9ca4a4] text-[10px] uppercase tracking-wider"
              style={{ fontFamily: FONT_MONO }}
            >
              Node size
            </span>
            <div className="flex items-center gap-2">
              <svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT} viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}>
                {SIZE_STEPS.map((step, index) => {
                  const cx = index === 0 ? 6 : index === 1 ? 24 : 48
                  return (
                    <circle key={index} cx={cx} cy={CANVAS_HEIGHT / 2} r={step.r} fill="#9ca4a4" />
                  )
                })}
                <text x="6"  y={CANVAS_HEIGHT - 1} textAnchor="middle" fontSize="7" fill="#9ca4a4">niche</text>
                <text x="48" y={CANVAS_HEIGHT - 1} textAnchor="middle" fontSize="7" fill="#9ca4a4">popular</text>
              </svg>
              <span className="text-[#9ca4a4] text-[10px] leading-tight" style={{ fontFamily: FONT_MONO }}>
                = Genius<br />views
              </span>
            </div>
          </div>

          <div className="border-t border-[#1b2211]" />

          {/* Node color */}
          <div className="flex flex-col gap-1.5">
            <span
              className="text-[#9ca4a4] text-[10px] uppercase tracking-wider"
              style={{ fontFamily: FONT_MONO }}
            >
              Node color
            </span>
            <div className="flex flex-col gap-1">
              {COLOR_STEPS.map((step) => (
                <div key={step.color} className="flex items-center gap-2">
                  <svg width="10" height="10" viewBox="0 0 10 10">
                    <circle cx="5" cy="5" r="4" fill={step.color} />
                  </svg>
                  <span className="text-[#676e6f] text-[10px]" style={{ fontFamily: FONT_MONO }}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#1b2211]" />

          {/* Edge direction */}
          <div className="flex flex-col gap-1.5">
            <span
              className="text-[#9ca4a4] text-[10px] uppercase tracking-wider"
              style={{ fontFamily: FONT_MONO }}
            >
              Edge (on hover)
            </span>
            <div className="flex flex-col gap-1">
              {EDGE_STEPS.map((step) => (
                <div key={step.label} className="flex items-center gap-2">
                  <svg width="24" height="10" viewBox="0 0 24 10">
                    <defs>
                      <marker id={`arrow-${step.label}`} markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
                        <path d="M0,0 L4,2 L0,4 Z" fill={step.color} />
                      </marker>
                    </defs>
                    <line x1="2" y1="5" x2="18" y2="5" stroke={step.color} strokeWidth="2" markerEnd={`url(#arrow-${step.label})`} />
                  </svg>
                  <span className="text-[#676e6f] text-[10px]" style={{ fontFamily: FONT_MONO }}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setExpanded((previous) => !previous)}
        className="flex items-center justify-between gap-3 bg-white border border-[#1b2211] rounded-xl px-4 py-3 hover:bg-[#fbffe5] transition-colors cursor-yellow-circle"
        aria-label={expanded ? 'Collapse legend' : 'Expand legend'}
      >
        <span
          className="text-[#676e6f] text-[11px] uppercase tracking-wider"
          style={{ fontFamily: FONT_MONO }}
        >
          Legend
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-[#9ca4a4] transition-transform duration-200 ${expanded ? 'rotate-180' : 'rotate-0'}`}
        >
          <polyline points="2,8 6,4 10,8" />
        </svg>
      </button>

    </div>
  )
}
