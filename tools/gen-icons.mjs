#!/usr/bin/env node
/**
 * Generates the extension icons as PNGs — no native image dependencies.
 *
 * The rounded tile and J monogram are rasterised with supersampling, then encoded with
 * a minimal PNG writer built on `node:zlib`. Keep the geometry in sync with
 * `docs/logo.svg` and `BrandMark` in `src/ui/Icons.tsx`.
 */
import zlib from 'node:zlib'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(here, '../src/icons')

/* ------------------------------------------------------------------ PNG ---- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

function encodePNG(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* -------------------------------------------------------------- geometry ---- */

/** Distance from a point to a line segment. */
function distSeg(px, py, ax, ay, bx, by) {
  const vx = bx - ax
  const vy = by - ay
  const len2 = vx * vx + vy * vy
  let t = len2 > 0 ? ((px - ax) * vx + (py - ay) * vy) / len2 : 0
  t = t < 0 ? 0 : t > 1 ? 1 : t
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy))
}

function cubicPoint(p0, p1, p2, p3, t) {
  const u = 1 - t
  return u ** 3 * p0 + 3 * u ** 2 * t * p1 + 3 * u * t ** 2 * p2 + t ** 3 * p3
}

const J_SEGMENTS = [
  [8.2 / 24, 6.5 / 24, 17.6 / 24, 6.5 / 24],
  [16.4 / 24, 6.5 / 24, 16.4 / 24, 15.4 / 24],
]

function addCurve(x0, y0, x1, y1, x2, y2, x3, y3) {
  let px = x0
  let py = y0
  for (let i = 1; i <= 24; i++) {
    const t = i / 24
    const x = cubicPoint(x0, x1, x2, x3, t)
    const y = cubicPoint(y0, y1, y2, y3, t)
    J_SEGMENTS.push([px / 24, py / 24, x / 24, y / 24])
    px = x
    py = y
  }
}

addCurve(16.4, 15.4, 16.4, 18.5, 14.2, 20.2, 11.3, 20.2)
addCurve(11.3, 20.2, 8.8, 20.2, 7.2, 18.9, 6.5, 16.9)

function monogramDist(x, y) {
  let d = Infinity
  for (const [ax, ay, bx, by] of J_SEGMENTS) {
    d = Math.min(d, distSeg(x, y, ax, ay, bx, by))
  }
  return d
}

/** Signed distance to a rounded rectangle; negative inside. */
function roundRectDist(px, py, x0, y0, x1, y1, r) {
  const cx = Math.max(x0 + r, Math.min(px, x1 - r))
  const cy = Math.max(y0 + r, Math.min(py, y1 - r))
  return Math.hypot(px - cx, py - cy) - r
}

/* ---------------------------------------------------------------- raster ---- */

const PAPER = [247, 244, 240]
const BORDER = [217, 208, 203]
const INK = [43, 38, 48]
const CORAL = [196, 96, 89]

function renderIcon(size) {
  const ss = size <= 32 ? 8 : 4
  const n = size * ss
  const half = 2.6 / 48 // stroke half-width in the 24-unit logo coordinate system
  const radius = 5 / 24
  const acc = new Float64Array(size * size * 4)

  for (let j = 0; j < n; j++) {
    const y = (j + 0.5) / n
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) / n
      const k = (Math.floor(j / ss) * size + Math.floor(i / ss)) * 4

      if (roundRectDist(x, y, 0, 0, 1, 1, radius) > 0) continue // outside the app tile

      let [r, g, b] = PAPER

      const border = Math.abs(roundRectDist(x, y, 0.35 / 24, 0.35 / 24, 23.65 / 24, 23.65 / 24, 4.65 / 24))
      if (border <= 0.7 / 48) {
        r = BORDER[0]
        g = BORDER[1]
        b = BORDER[2]
      }

      const d = monogramDist(x, y)
      if (d <= half) {
        r = INK[0]
        g = INK[1]
        b = INK[2]
      }

      const node = roundRectDist(x, y, 5.8 / 24, 11.5 / 24, 7.8 / 24, 13.5 / 24, 0.45 / 24)
      if (node <= 0) {
        r = CORAL[0]
        g = CORAL[1]
        b = CORAL[2]
      }

      acc[k] += r
      acc[k + 1] += g
      acc[k + 2] += b
      acc[k + 3] += 255
    }
  }

  const samples = ss * ss
  const out = Buffer.alloc(size * size * 4)
  for (let p = 0; p < size * size; p++) {
    const alpha = acc[p * 4 + 3] / samples
    if (alpha <= 0) continue
    // Un-premultiply so edge pixels keep their colour instead of darkening toward black.
    const cover = alpha / 255
    out[p * 4] = Math.round(acc[p * 4] / samples / cover)
    out[p * 4 + 1] = Math.round(acc[p * 4 + 1] / samples / cover)
    out[p * 4 + 2] = Math.round(acc[p * 4 + 2] / samples / cover)
    out[p * 4 + 3] = Math.round(alpha)
  }
  return out
}

/* ------------------------------------------------------------------ main ---- */

const SIZES = [16, 32, 48, 128]
await fsp.mkdir(outDir, { recursive: true })

for (const size of SIZES) {
  const png = encodePNG(size, size, renderIcon(size))
  const file = path.join(outDir, `icon${size}.png`)
  await fsp.writeFile(file, png)
  console.log(`[icons] icon${size}.png  ${(png.length / 1024).toFixed(1)} kB`)
}
