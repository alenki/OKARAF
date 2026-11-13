/**
 * The veil: a sheet of ink over the whole window.
 *
 * It covers the page on arrival, counts while the essentials load, then leaves through the
 * dither, from the bottom of the window to the top. Leaving a page plays the same thing in
 * reverse: ink rises from the bottom until the window is covered, and then the browser
 * navigates. It is drawn on a low-resolution 2D canvas, so it works with or without WebGL.
 */
import { gsap } from 'gsap'
import { BAYER8, cellDevicePx, dpr, rgba32, token } from './dither'

/** Veil cells are larger than the page's, so the transition reads at a glance. */
const VEIL_CELL = 4
const SWEEP = 1.1

export class Veil {
  readonly el: HTMLElement

  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private count: HTMLElement | null
  private ui: HTMLElement | null
  private out: ImageData | null = null
  private out32: Uint32Array | null = null
  private cols = 0
  private rows = 0
  private ink = 0
  /** 1 = window fully covered, 0 = fully open. */
  private cover = 1
  private closing = false

  constructor(el: HTMLElement) {
    this.el = el
    this.canvas = el.querySelector('[data-veil-bits]') as HTMLCanvasElement
    this.ctx = this.canvas.getContext('2d')!
    this.count = el.querySelector('[data-veil-count]')
    this.ui = el.querySelector('[data-veil-ui]')

    const [r, g, b] = token('--ink')
    this.ink = rgba32(r, g, b)

    this.resize()
    this.paint()
    // From here on the canvas is what covers the page, not the CSS background.
    el.classList.add('is-live')

    window.addEventListener('resize', () => {
      this.resize()
      this.paint()
    })
  }

  /** Show a number in the corner, each figure in its own fixed cell. */
  setCount(n: number) {
    if (!this.count) return
    const text = String(Math.round(n)).padStart(3, '0')
    if (this.count.dataset.v === text) return
    this.count.dataset.v = text
    this.count.innerHTML = [...text].map((d) => `<i>${d}</i>`).join('')
  }

  /** Let the counter and wordmark go. */
  hideUi(duration = 0.35) {
    if (!this.ui) return gsap.timeline()
    return gsap.timeline().to(this.ui, { autoAlpha: 0, duration, ease: 'power1.out' })
  }

  /** Uncover the page. */
  open(duration = 1.25) {
    this.closing = false
    this.el.classList.remove('is-done')
    return gsap
      .timeline({
        onComplete: () => {
          this.el.classList.add('is-done')
          this.el.classList.remove('is-blocking')
        },
      })
      .to(this, { cover: 0, duration, ease: 'power2.inOut', onUpdate: () => this.paint() })
  }

  /** Cover the page (before navigating away). */
  close(duration = 0.75) {
    this.closing = true
    this.el.classList.remove('is-done')
    this.el.classList.add('is-blocking')
    if (this.ui) gsap.set(this.ui, { autoAlpha: 0 })
    this.resize()
    return gsap.timeline().to(this, { cover: 1, duration, ease: 'power2.inOut', onUpdate: () => this.paint() })
  }

  /** Jump straight to open (page restored from the back/forward cache). */
  reset() {
    gsap.killTweensOf(this)
    this.closing = false
    this.cover = 0
    this.paint()
    this.el.classList.add('is-done')
    this.el.classList.remove('is-blocking')
  }

  private resize() {
    const ratio = dpr()
    const px = cellDevicePx(VEIL_CELL)
    const cols = Math.ceil((window.innerWidth * ratio) / px)
    const rows = Math.ceil((window.innerHeight * ratio) / px)
    if (cols === this.cols && rows === this.rows) return
    this.cols = cols
    this.rows = rows
    this.canvas.width = cols
    this.canvas.height = rows
    this.canvas.style.width = `${(cols * px) / ratio}px`
    this.canvas.style.height = `${(rows * px) / ratio}px`
    this.out = this.ctx.createImageData(cols, rows)
    this.out32 = new Uint32Array(this.out.data.buffer)
  }

  private paint() {
    const { out, out32, cols, rows, ink } = this
    if (!out || !out32) return

    // Ink stands wherever the matrix is below the local coverage. Both movements travel
    // upward: when closing, ink gathers at the bottom first; when opening, the bottom
    // clears first.
    const lead = this.cover * (1 + SWEEP) * 64
    const fall = (SWEEP * 64) / rows
    const closing = this.closing
    for (let y = 0, i = 0; y < rows; y++) {
      const k = lead - fall * (closing ? rows - 1 - y : y)
      const row = (y & 7) << 3
      if (k >= 64) {
        for (let x = 0; x < cols; x++, i++) out32[i] = ink
      } else if (k <= 0) {
        for (let x = 0; x < cols; x++, i++) out32[i] = 0
      } else {
        for (let x = 0; x < cols; x++, i++) out32[i] = BAYER8[row | (x & 7)] < k ? ink : 0
      }
    }
    this.ctx.putImageData(out, 0, 0)
  }
}
