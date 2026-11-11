/**
 * The edge: where the sheet meets the hero, ink arriving dot by dot.
 *
 * It is drawn here, inside the hero and on the field's own cells, not carried up by the
 * sheet as a strip of dots. Two dithers that slide across each other beat: every pixel of
 * scroll changes which of the field's dots fall between the strip's, and the band between
 * hero and sheet strobes. So the dots stay where they are and only the coverage travels.
 * A cell is inked once, when the gradient reaches its place in the matrix, and it is the
 * same cell, with the same threshold, that the field underneath is dithered on.
 *
 * A 2D canvas, like the veil, so the name is covered the same way with or without WebGL.
 */
import { BAYER8, CELL, LEVELS, cellDevicePx, dpr, rgba32, token } from './dither'
import { onScroll } from './scroll'

export class Edge {
  private canvas: HTMLCanvasElement
  private host: HTMLElement
  private sheet: HTMLElement
  private ctx: CanvasRenderingContext2D
  private out: ImageData | null = null
  private out32: Uint32Array | null = null
  /** Coverage last painted on each row of cells, 0…64. */
  private levels = new Int8Array(0)
  private cols = 0
  private rows = 0
  private px = 0
  /** Height of the gradient, in cells. */
  private rise = 1
  /** Where the sheet stood when this was last painted. */
  private drawn = NaN
  private ink = 0

  /** `canvas` lies over the hero; `sheet` is what rises over it. Call after initScroll(). */
  constructor(canvas: HTMLCanvasElement, sheet: HTMLElement) {
    this.canvas = canvas
    this.host = canvas.parentElement as HTMLElement
    this.sheet = sheet
    this.ctx = canvas.getContext('2d')!

    const [r, g, b] = token('--ink')
    this.ink = rgba32(r, g, b)

    const refit = () => {
      this.resize()
      this.paint()
    }
    refit()
    new ResizeObserver(refit).observe(this.host)
    onScroll(() => this.paint())
  }

  private resize() {
    // The same arithmetic as the field's, so the two canvases share every cell.
    const ratio = dpr()
    const px = cellDevicePx(CELL)
    const box = this.host.getBoundingClientRect()
    const cols = Math.max(2, Math.ceil((box.width * ratio) / px))
    const rows = Math.max(2, Math.ceil((box.height * ratio) / px))

    // Sized to the hero, so the gradient never swallows the name.
    this.rise = Math.max(1, Math.round(Math.min(352, box.height * 0.38) / CELL))
    this.drawn = NaN
    if (cols === this.cols && rows === this.rows && px === this.px) return

    this.cols = cols
    this.rows = rows
    this.px = px
    this.canvas.width = cols
    this.canvas.height = rows
    this.canvas.style.width = `${(cols * px) / ratio}px`
    this.canvas.style.height = `${(rows * px) / ratio}px`
    this.out = this.ctx.createImageData(cols, rows)
    this.out32 = new Uint32Array(this.out.data.buffer)
    this.levels = new Int8Array(rows).fill(-1)
  }

  /** Ink stands wherever the matrix is below the local coverage. */
  private paint() {
    const { out, out32, levels, cols, rows, rise, ink } = this
    if (!out || !out32) return

    // The sheet's top edge, in cells below the top of the hero.
    const gap = this.sheet.getBoundingClientRect().top - this.host.getBoundingClientRect().top
    const top = Math.max(0, (gap * dpr()) / this.px)
    if (top === this.drawn) return
    this.drawn = top

    let first = rows
    let last = -1
    for (let y = 0; y < rows; y++) {
      // 0 where the gradient begins, 1 at the sheet and below it. Eased, so the edge gathers
      // slowly and closes quickly.
      const t = Math.min(1, Math.max(0, 1 - (top - y - 0.5) / rise))
      const level = Math.ceil(t * t * (3 - 2 * t) * LEVELS)
      if (level === levels[y]) continue
      levels[y] = level

      const start = y * cols
      if (level <= 0) {
        out32.fill(0, start, start + cols)
      } else if (level >= LEVELS) {
        out32.fill(ink, start, start + cols)
      } else {
        // The field counts its rows from the bottom, so the matrix is read the same way.
        const row = ((rows - 1 - y) & 7) << 3
        for (let x = 0, i = start; x < cols; x++, i++) out32[i] = BAYER8[row | (x & 7)] < level ? ink : 0
      }
      if (y < first) first = y
      last = y
    }
    // Only the rows whose coverage changed are sent to the canvas.
    if (last >= first) this.ctx.putImageData(out, 0, 0, 0, first, cols, last - first + 1)
  }
}
