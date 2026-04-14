import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
}

interface Edge {
  source: number
  target: number
}

const COLORS = ['#7F77DD', '#1D9E75', '#888780', '#888780', '#888780']
const NODE_COUNT = 22

function buildParticles(width: number, height: number): Particle[] {
  return Array.from({ length: NODE_COUNT }, (_, index) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.18,
    vy: (Math.random() - 0.5) * 0.18,
    radius: 3 + Math.random() * 7,
    color: COLORS[index % COLORS.length],
  }))
}

function buildEdges(): Edge[] {
  // Hub-spoke: node 0 connects to several, then a few clusters
  return [
    { source: 0, target: 1 }, { source: 0, target: 2 }, { source: 0, target: 3 },
    { source: 0, target: 4 }, { source: 0, target: 5 },
    { source: 1, target: 6 }, { source: 1, target: 7 },
    { source: 2, target: 8 }, { source: 2, target: 9 },
    { source: 3, target: 10 }, { source: 3, target: 11 },
    { source: 4, target: 12 }, { source: 4, target: 13 },
    { source: 5, target: 14 }, { source: 5, target: 15 },
    { source: 6, target: 16 }, { source: 8, target: 17 },
    { source: 10, target: 18 }, { source: 12, target: 19 },
    { source: 7, target: 20 }, { source: 9, target: 21 },
    // Cross-connections for realism
    { source: 6, target: 8 }, { source: 11, target: 13 },
    { source: 16, target: 17 }, { source: 18, target: 19 },
  ]
}

export default function BackgroundGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = canvas.offsetWidth
    let height = canvas.offsetHeight
    canvas.width = width
    canvas.height = height

    const particles = buildParticles(width, height)
    const edges = buildEdges()
    let rafId: number

    const handleResize = () => {
      width = canvas.offsetWidth
      height = canvas.offsetHeight
      canvas.width = width
      canvas.height = height
    }
    window.addEventListener('resize', handleResize)

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      // Edges
      for (const edge of edges) {
        const source = particles[edge.source]
        const target = particles[edge.target]
        if (!source || !target) continue

        ctx.beginPath()
        ctx.moveTo(source.x, source.y)
        ctx.lineTo(target.x, target.y)
        ctx.strokeStyle = 'rgba(255,255,255,0.04)'
        ctx.lineWidth = 0.8
        ctx.stroke()
      }

      // Nodes
      for (const particle of particles) {
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        // Parse hex color and apply low opacity
        ctx.fillStyle = particle.color + '18'  // ~10% opacity
        ctx.fill()
        ctx.strokeStyle = particle.color + '30' // ~19% opacity border
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Move particles
      for (const particle of particles) {
        particle.x += particle.vx
        particle.y += particle.vy

        // Soft bounce at edges
        if (particle.x < 0 || particle.x > width) particle.vx *= -1
        if (particle.y < 0 || particle.y > height) particle.vy *= -1
      }

      rafId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  )
}
