/**
 * A plate: a picture that sits on the page as a 1-bit engraving and resolves into colour.
 *
 * The real <img> stays in the document, sharp and at full resolution. On top of it lies a
 * small canvas holding the picture's dithered copy, one canvas pixel per dither cell. As
 * `progress` goes from 0 to 1 the copy lets go of its cells in matrix order, top to bottom,
 * and the colour underneath shows through. Nothing is ever cross-faded.
 */
import { gsap } from 'gsap'
import { BAYER8, CELL, cellDevicePx, dpr, rgba32, token } from './dither'

/** How far the resolving front is spread down the picture (0 = everything at once). */
const SWEEP = 0.85
/** Lifts the mid-tones a little before thresholding so screenshots keep their detail. */
const GAMMA = 0.92

const dirty = new Set<Plate>()
let ticking = false

function flush() {
  dirty.forEach((plate) => plate.paint())
  dirty.clear()
}

export class Plate {
  readonly el: HTMLElement
  readonly img: HTMLImageElement

  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private bits: Uint8Array | null = null
  private out: ImageData | null = null
  private out32: Uint32Array | null = null
  private cols = 0
  private rows = 0
  private value = 0
  private painted = -1
  private on = 0
  private off = 0
  private ready = false

  constructor(el: HTMLElement) {
    this.el = el
    this.img = el.querySelector('img') as HTMLImageElement

    this.canvas = document.createElement('canvas')
    this.canvas.className = 'plate__bits'
    this.canvas.setAttribute('aria-hidden', 'true')
    // Pixels are written from script every frame of a resolve, so keep this canvas on the CPU.
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!
    el.appendChild(this.canvas)

    if (!ticking) {
      ticking = true
      gsap.ticker.add(flush)
    }

    const [sr, sg, sb] = token('--silver')
    const [ir, ig, ib] = token('--ink')
    this.on = rgba32(sr, sg, sb)
    this.off = rgba32(ir, ig, ib)

    const whenLoaded = () => this.build()
    if (this.img.complete && this.img.naturalWidth > 0) whenLoaded()
    this.img.addEventListener('load', whenLoaded)

    let width = 0
    new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width)
      if (w === width) return
      width = w
      if (this.ready) this.build()
    }).observe(el)
  }

  /** 0 = fully dithered, 1 = fully resolved into colour. */
  get progress() {
    return this.value
  }

  set progress(v: number) {
    const clamped = v < 0 ? 0 : v > 1 ? 1 : v
    if (clamped === this.value) return
    this.value = clamped
    dirty.add(this)
  }

  /** Point the plate at another picture (used by the certificate that follows the pointer). */
  show(src: string, width: number, height: number) {
    this.ready = false
    this.el.classList.remove('is-ready')
    this.el.style.setProperty('--ar', `${width} / ${height}`)
    this.img.width = width
    this.img.height = height
    if (this.img.getAttribute('src') !== src) this.img.src = src
    else if (this.img.complete) this.build()
  }

  /** Read the picture once and keep its 1-bit copy. */
  private build() {
    const box = this.el.getBoundingClientRect()
    if (box.width < 2 || box.height < 2 || this.img.naturalWidth === 0) return

    const ratio = dpr()
    const px = cellDevicePx(CELL)
    const cols = Math.ceil((box.width * ratio) / px)
    const rows = Math.ceil((box.height * ratio) / px)
    this.cols = cols
    this.rows = rows

    this.canvas.width = cols
    this.canvas.height = rows
    this.canvas.style.width = `${(cols * px) / ratio}px`
    this.canvas.style.height = `${(rows * px) / ratio}px`

    const ctx = this.ctx
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    try {
      ctx.drawImage(this.img, 0, 0, cols, rows)
    } catch {
      return
    }
    const src = ctx.getImageData(0, 0, cols, rows).data

    const bits = new Uint8Array(cols * rows)
    for (let y = 0, i = 0; y < rows; y++) {
      const row = (y & 7) << 3
      for (let x = 0; x < cols; x++, i++) {
        const o = i << 2
        const lum = (src[o] * 0.299 + src[o + 1] * 0.587 + src[o + 2] * 0.114) / 255
        bits[i] = Math.pow(lum, GAMMA) * 64 > BAYER8[row | (x & 7)] + 0.5 ? 1 : 0
      }
    }
    this.bits = bits
    this.out = ctx.createImageData(cols, rows)
    this.out32 = new Uint32Array(this.out.data.buffer)

    this.painted = -1
    this.paint()
    this.ready = true
    this.el.classList.add('is-ready')
  }

  /** Called from the shared ticker whenever `progress` changed. */
  paint() {
    const { bits, out, out32, cols, rows } = this
    if (!bits || !out || !out32) return
    const p = this.value
    if (p === this.painted) return
    this.painted = p

    if (p >= 1) {
      this.canvas.style.visibility = 'hidden'
      return
    }
    this.canvas.style.visibility = 'visible'

    const { on, off } = this
    const lead = p * (1 + SWEEP) * 64
    const fall = (SWEEP * 64) / rows
    for (let y = 0, i = 0; y < rows; y++) {
      const k = lead - fall * y
      const row = (y & 7) << 3
      if (k <= 0) {
        for (let x = 0; x < cols; x++, i++) out32[i] = bits[i] ? on : off
      } else if (k >= 64) {
        for (let x = 0; x < cols; x++, i++) out32[i] = 0
      } else {
        for (let x = 0; x < cols; x++, i++) {
          out32[i] = BAYER8[row | (x & 7)] < k ? 0 : bits[i] ? on : off
        }
      }
    }
    this.ctx.putImageData(out, 0, 0)
  }
}
