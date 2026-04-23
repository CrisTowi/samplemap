import { useEffect, useRef } from 'react'

interface Props {
  active: boolean
}

export default function SearchWaveDivider({ active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const activeRef = useRef(active)
  const rafIdRef = useRef<number>(0)
  const amplitudeRef = useRef(0)
  // Three wave components with different frequencies and phase speeds
  const phase1Ref = useRef(0)
  const phase2Ref = useRef(0)
  const phase3Ref = useRef(0)

  useEffect(() => {
    activeRef.current = active
  }, [active])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const cssWidth = canvas.offsetWidth
      const cssHeight = canvas.offsetHeight
      const pixelWidth = Math.round(cssWidth * dpr)
      const pixelHeight = Math.round(cssHeight * dpr)

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth
        canvas.height = pixelHeight
      }

      const isActive = activeRef.current
      const targetAmplitude = isActive ? 5 * dpr : 0
      amplitudeRef.current += (targetAmplitude - amplitudeRef.current) * 0.07

      // Only advance phases while active — freeze the wave when not typing
      if (isActive) {
        phase1Ref.current += 0.06
        phase2Ref.current += 0.10
        phase3Ref.current += 0.035
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.beginPath()
      ctx.strokeStyle = '#1b2211'
      ctx.lineWidth = dpr

      const midY = canvas.height / 2
      const amplitude = amplitudeRef.current

      // Pixel-based frequencies: cycle length stays constant in CSS px regardless of screen width.
      // Derived from what looks good on mobile (~26 / 15 / 10 px per cycle).
      const freq1 = (2 * Math.PI) / 26
      const freq2 = (2 * Math.PI) / 15
      const freq3 = (2 * Math.PI) / 10

      for (let x = 0; x <= canvas.width; x++) {
        const xCss = x / dpr
        const y = midY + amplitude * (
          0.50 * Math.sin(xCss * freq1 + phase1Ref.current) +
          0.32 * Math.sin(xCss * freq2 + phase2Ref.current) +
          0.18 * Math.sin(xCss * freq3 + phase3Ref.current)
        )
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      rafIdRef.current = requestAnimationFrame(draw)
    }

    rafIdRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafIdRef.current)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute left-0 right-0"
      style={{ top: 'calc(50% - 152px)', width: '100%', height: '13px', display: 'block' }}
    />
  )
}
