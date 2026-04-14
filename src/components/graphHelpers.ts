import type { Settings } from 'sigma/settings'
import type { NodeDisplayData, PartialButFor } from 'sigma/types'

/**
 * Custom node label renderer — replaces Sigma's default white-background label
 * with a dark semi-transparent pill so labels stay readable on the dark canvas.
 */
export function drawDarkLabel(
  context: CanvasRenderingContext2D,
  data: PartialButFor<NodeDisplayData, 'x' | 'y' | 'size' | 'label' | 'color'>,
  settings: Settings
): void {
  if (!data.label) return

  const size: number = settings.labelSize ?? 11
  const font: string = settings.labelFont ?? 'sans-serif'
  const weight: string = settings.labelWeight ?? '400'

  context.font = `${weight} ${size}px ${font}`

  const textWidth = context.measureText(data.label).width
  const x = Math.round(data.x + data.size + 4)
  const y = Math.round(data.y)
  const padX = 4
  const padY = 3

  // Dark pill background
  context.fillStyle = 'rgba(18, 18, 22, 0.82)'
  context.beginPath()
  context.roundRect(x - padX, y - size / 2 - padY, textWidth + padX * 2, size + padY * 2, 4)
  context.fill()

  // Label text
  context.fillStyle = '#d4d4d2'
  context.fillText(data.label, x, y + size / 2 - 1)
}

/**
 * Custom node hover renderer — draws a highlight ring around the node
 * then the dark label. Replaces Sigma's default which draws a white label background.
 */
export function drawDarkNodeHover(
  context: CanvasRenderingContext2D,
  data: PartialButFor<NodeDisplayData, 'x' | 'y' | 'size' | 'label' | 'color'>,
  settings: Settings
): void {
  const { x, y, size, color } = data

  // Outer glow ring
  context.beginPath()
  context.arc(x, y, size + 6, 0, Math.PI * 2)
  context.fillStyle = `${color}33` // node color at ~20% opacity
  context.fill()

  // Highlight border ring
  context.beginPath()
  context.arc(x, y, size + 2, 0, Math.PI * 2)
  context.strokeStyle = color ?? '#fff'
  context.lineWidth = 2
  context.stroke()

  // Node body (re-draw so it sits on top of the rings)
  context.beginPath()
  context.arc(x, y, size, 0, Math.PI * 2)
  context.fillStyle = color ?? '#888'
  context.fill()

  // Label
  drawDarkLabel(context, data, settings)
}
