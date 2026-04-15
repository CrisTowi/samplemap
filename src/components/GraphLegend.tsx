import { useState } from 'react'

const SIZE_STEPS = [
  { r: 5, label: 'niche' },
  { r: 9, label: '' },
  { r: 14, label: 'popular' },
]

const COLOR_STEPS = [
  { color: '#7F77DD', label: 'root' },
  { color: '#1D9E75', label: 'depth 1' },
  { color: '#888780', label: 'depth 2+' },
]

const CANVAS_HEIGHT = 30
const CANVAS_WIDTH = 74

export default function GraphLegend() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="relative flex flex-col items-stretch min-w-[168px]">

      {/* Expanded body — grows upward from the header */}
      {expanded && (
        <div className="absolute bottom-full mb-2 left-0 right-0 flex flex-col gap-3 bg-black/50 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3">

          {/* Node size */}
          <div className="flex flex-col gap-1.5">
            <span className="text-white/40 text-[10px] font-semibold uppercase tracking-widest">
              Node size
            </span>
            <div className="flex items-center gap-2">
              <svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT} viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}>
                {SIZE_STEPS.map((step, index) => {
                  const cx = index === 0 ? 6 : index === 1 ? 24 : 48
                  return (
                    <circle key={index} cx={cx} cy={CANVAS_HEIGHT / 2} r={step.r} fill="#888780" />
                  )
                })}
                <text x="6"  y={CANVAS_HEIGHT - 1} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.3)">niche</text>
                <text x="48" y={CANVAS_HEIGHT - 1} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.3)">popular</text>
              </svg>
              <span className="text-white/40 text-[10px] leading-tight">
                = Genius<br />views
              </span>
            </div>
          </div>

          <div className="border-t border-white/10" />

          {/* Node color */}
          <div className="flex flex-col gap-1.5">
            <span className="text-white/40 text-[10px] font-semibold uppercase tracking-widest">
              Node color
            </span>
            <div className="flex flex-col gap-1">
              {COLOR_STEPS.map((step) => (
                <div key={step.color} className="flex items-center gap-2">
                  <svg width="10" height="10" viewBox="0 0 10 10">
                    <circle cx="5" cy="5" r="4" fill={step.color} />
                  </svg>
                  <span className="text-white/40 text-[10px]">{step.label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Header — always same height as DepthSlider */}
      <button
        onClick={() => setExpanded((previous) => !previous)}
        className="flex items-center justify-between gap-3 bg-black/50 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 hover:bg-white/5 transition-colors"
        aria-label={expanded ? 'Collapse legend' : 'Expand legend'}
      >
        <span className="text-white/50 text-xs font-medium uppercase tracking-wider">Legend</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-white/30 transition-transform duration-200 ${expanded ? 'rotate-180' : 'rotate-0'}`}
        >
          <polyline points="2,8 6,4 10,8" />
        </svg>
      </button>

    </div>
  )
}
