/**
 * The one material the whole site is made of: an 8×8 ordered (Bayer) dither.
 *
 * This file owns the matrix and the two things the DOM needs from it:
 *  - mask tiles, so any element can appear or leave through the dither instead of fading;
 *  - a dithered gradient, used as the leading edge of the sheet that slides over the hero.
 *
 * The WebGL field (field.ts), the image plates (plate.ts) and the veil (veil.ts) use the
 * same matrix, so every dot on the page belongs to the same grid.
 */
import { gsap } from 'gsap'

/** Bayer 8×8 threshold map, values 0…63, row-major. */
// prettier-ignore
export const BAYER8 = new Uint8Array([
   0, 48, 12, 60,  3, 51, 15, 63,
  32, 16, 44, 28, 35, 19, 47, 31,
   8, 56,  4, 52, 11, 59,  7, 55,
  40, 24, 36, 20, 43, 27, 39, 23,
   2, 50, 14, 62,  1, 49, 13, 61,
  34, 18, 46, 30, 33, 17, 45, 29,
  10, 58,  6, 54,  9, 57,  5, 53,
  42, 26, 38, 22, 41, 25, 37, 21,
])

/** Number of distinct coverage steps a tile can show: 0 (nothing) … 64 (solid). */
export const LEVELS = 64

/** Default size of one dither cell, in CSS pixels. Matches the hero field. */
export const CELL = 2

export const dpr = () => Math.min(window.devicePixelRatio || 1, 3)

/**
 * Size of a dither cell in whole device pixels. A cell that lands between device pixels
 * turns a clean pattern into moiré, so every canvas on the site is sized from this.
 */
export const cellDevicePx = (cssCell = CELL) => Math.max(1, Math.round(cssCell * dpr()))

/** Pack an sRGB colour into the little-endian RGBA word ImageData expects. */
export const rgba32 = (r: number, g: number, b: number, a = 255) =>
  ((a << 24) | (b << 16) | (g << 8) | r) >>> 0

/** Read a colour token such as --ink from the stylesheet as [r, g, b] in 0…255. */
export function token(name: string): [number, number, number] {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const hex = raw.replace('#', '')
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
  }
  const nums = raw.match(/[\d.]+/g)
  return nums && nums.length >= 3 ? [+nums[0], +nums[1], +nums[2]] : [0, 0, 0]
}

/* Mask tiles ---------------------------------------------------------------- */

const tiles = new Map<string, string>()

/** A data-URL tile that is opaque wherever the matrix is below `level`. */
export function tile(level: number, cssCell = CELL): string {
  const px = cellDevicePx(cssCell)
  const key = `${level}@${px}`
  let url = tiles.get(key)
  if (url) return url

  const c = document.createElement('canvas')
  c.width = c.height = 8 * px
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#000'
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (BAYER8[y * 8 + x] < level) ctx.fillRect(x * px, y * px, px, px)
    }
  }
  url = `url(${c.toDataURL('image/png')})`
  tiles.set(key, url)
  return url
}

/** Show `el` at a given coverage. 64 (or more) removes the mask entirely. */
export function setMask(el: HTMLElement, level: number, cssCell = CELL) {
  const s = el.style
  if (level >= LEVELS) {
    s.removeProperty('-webkit-mask-image')
    s.removeProperty('mask-image')
    s.removeProperty('-webkit-mask-size')
    s.removeProperty('mask-size')
    return
  }
  const size = `${(8 * cellDevicePx(cssCell)) / dpr()}px`
  const url = tile(Math.max(0, level), cssCell)
  s.setProperty('-webkit-mask-image', url)
  s.setProperty('mask-image', url)
  s.setProperty('-webkit-mask-size', `${size} ${size}`)
  s.setProperty('mask-size', `${size} ${size}`)
}

export interface DitherTween {
  from?: number
  to?: number
  duration?: number
  delay?: number
  stagger?: number
  ease?: string
  cell?: number
  onComplete?: () => void
}

/**
 * Bring elements in (or take them out) through the dither: coverage steps from `from` to
 * `to`, one matrix level at a time. This is the site's replacement for a fade.
 */
export function ditherTo(targets: HTMLElement | HTMLElement[], opts: DitherTween = {}) {
  const els = Array.isArray(targets) ? targets : [targets]
  const {
    from = 0,
    to = LEVELS,
    duration = 0.9,
    delay = 0,
    stagger = 0,
    ease = 'power2.inOut',
    cell = CELL,
    onComplete,
  } = opts

  const tl = gsap.timeline({ delay, onComplete })
  els.forEach((el, i) => {
    const state = { v: from }
    let shown = -1
    const apply = () => {
      const level = Math.round(state.v)
      if (level === shown) return
      shown = level
      setMask(el, level, cell)
      el.style.visibility = level <= 0 ? 'hidden' : 'visible'
    }
    tl.to(state, { v: to, duration, ease, onStart: apply, onUpdate: apply, onComplete: apply }, i * stagger)
  })
  return tl
}

/* The dithered gradient -------------------------------------------------------- */

/**
 * Publishes --dither-rise: a strip that goes from empty at the top to solid ink at the
 * bottom, one matrix level at a time. Tiled sideways it becomes the edge of the sheet.
 */
export function publishRise(rows = 176) {
  const px = cellDevicePx()
  const [r, g, b] = token('--ink')

  const c = document.createElement('canvas')
  c.width = 8 * px
  c.height = rows * px
  const ctx = c.getContext('2d')!
  ctx.fillStyle = `rgb(${r} ${g} ${b})`
  for (let y = 0; y < rows; y++) {
    // Eased, so the edge gathers slowly and closes quickly.
    const t = y / (rows - 1)
    const density = t * t * (3 - 2 * t)
    const level = density * LEVELS
    for (let x = 0; x < 8; x++) {
      if (BAYER8[(y & 7) * 8 + x] < level) ctx.fillRect(x * px, y * px, px, px)
    }
  }

  const root = document.documentElement.style
  const w = (8 * px) / dpr()
  const h = (rows * px) / dpr()
  root.setProperty('--dither-rise', `url(${c.toDataURL('image/png')})`)
  root.setProperty('--dither-rise-size', `${w}px ${h}px`)
  root.setProperty('--edge', `${h}px`)
}
