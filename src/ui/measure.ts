/**
 * Text width measurement for the graph layout.
 *
 * The layout needs a width for every node *before* anything is positioned, so measuring
 * real DOM elements per string is not an option — it would mean one forced reflow per node
 * per re-layout.
 *
 * Canvas is fast, but its font resolution is not guaranteed to agree with the DOM's: on
 * macOS a stack naming `SF Mono` resolved to the real (wider) face in the DOM and to a
 * fallback in canvas, which silently clipped every label. So the canvas is calibrated
 * against one real DOM measurement of the same string, and every width is scaled by that
 * ratio. Both faces are monospaced, so the ratio is a uniform advance-width correction —
 * exact, not an approximation — and it holds for whatever font the design system picks.
 */

import type { CodeFont } from '@/platform/settings'
import { CODE_FONT_STACKS } from './metrics'

const PROBE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

let context: CanvasRenderingContext2D | null | undefined
let appliedFont = ''

function canvas(): CanvasRenderingContext2D | null {
  if (context === undefined) {
    context =
      typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')
  }
  return context
}

/** Width of `text` as the browser actually lays it out, in CSS pixels. */
function domWidth(text: string, font: string): number {
  const span = document.createElement('span')
  span.style.cssText = `position:absolute;left:-99999px;top:0;visibility:hidden;white-space:pre;font:${font}`
  span.textContent = text
  document.body.appendChild(span)
  const width = span.getBoundingClientRect().width
  span.remove()
  return width
}

export function createTextMeasure(fontSize: number, fontFamily: CodeFont = 'jetbrains'): (text: string) => number {
  const font = `${fontSize}px ${CODE_FONT_STACKS[fontFamily]}`
  const ctx = canvas()
  const cache = new Map<string, number>()

  // Rough fallback for environments without a canvas (unit tests, exotic embeddings).
  if (!ctx) return (text: string) => text.length * fontSize * 0.62

  let scale = 1
  if (typeof document !== 'undefined' && document.body) {
    if (appliedFont !== font) {
      ctx.font = font
      appliedFont = font
    }
    const canvasWidth = ctx.measureText(PROBE).width
    const realWidth = domWidth(PROBE, font)
    if (canvasWidth > 0 && realWidth > 0) scale = realWidth / canvasWidth
  }

  return (text: string): number => {
    const hit = cache.get(text)
    if (hit !== undefined) return hit
    if (appliedFont !== font) {
      ctx.font = font
      appliedFont = font
    }
    const width = ctx.measureText(text).width * scale
    if (cache.size > 5000) cache.clear()
    cache.set(text, width)
    return width
  }
}

const BEZIER_RESOLUTION = 8

/**
 * CSS `cubic-bezier(x1, y1, x2, y2)` as a JS easing function.
 *
 * The graph's edges are animated imperatively while the nodes are animated by a CSS
 * transition, so the two must use the same curve or they visibly drift apart.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx

  return (x: number): number => {
    if (x <= 0) return 0
    if (x >= 1) return 1

    let t = x
    for (let i = 0; i < BEZIER_RESOLUTION; i++) {
      const error = sampleX(t) - x
      if (Math.abs(error) < 1e-4) return sampleY(t)
      const slope = slopeX(t)
      if (Math.abs(slope) < 1e-6) break
      t -= error / slope
    }

    let low = 0
    let high = 1
    t = x
    for (let i = 0; i < 12; i++) {
      const value = sampleX(t)
      if (Math.abs(value - x) < 1e-4) break
      if (value < x) low = t
      else high = t
      t = (low + high) / 2
    }
    return sampleY(t)
  }
}

/** Matches `--ease-out` in tokens.css. */
export const easeOut = cubicBezier(0.22, 1, 0.36, 1)
