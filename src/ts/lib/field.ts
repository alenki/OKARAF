/**
 * The field: the dithered marble behind the name.
 *
 * It is the same picture the old React Three Fiber component drew (same noise, same domain
 * warp, same Bayer matrix, same four-level quantiser), written as one small WebGL program:
 *
 *  - one fragment per dither cell instead of one per screen pixel, scaled up with
 *    `image-rendering: pixelated`; on a phone that is about 1/36th of the shading work;
 *  - cells are whole device pixels, so the pattern stays crisp at any zoom or pixel ratio;
 *  - it draws only while it is on screen and the tab is visible.
 */
import { BAYER8, cellDevicePx, dpr, token, CELL } from './dither'

const VERT = /* glsl */ `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

const FRAG = /* glsl */ `
precision highp float;

uniform vec2 uRes;        // size of the canvas, in dither cells
uniform float uTime;
uniform float uSpeed;
uniform float uZoom;
uniform vec2 uShift;
uniform float uGain;      // overall density; 0 is bare ink
uniform vec2 uPointer;    // in cells, measured from the top-left
uniform float uPointerOn;
uniform float uPointerR;
uniform vec3 uInk;
uniform vec3 uTone1;
uniform vec3 uTone2;
uniform vec3 uTone3;
uniform sampler2D uBayer;

vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec2 fade(vec2 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

// Classic Perlin noise, 2D.
float cnoise(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod289(Pi);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
  g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
}

// Six octaves. The original summed eight, but the last two are below 0.1% and far past
// what a 2px cell can show.
float fbm(vec2 p) {
  float value = 0.0;
  float amp = 1.0;
  for (int i = 0; i < 6; i++) {
    value += amp * abs(cnoise(p));
    p *= 3.0;
    amp *= 0.3;
  }
  return value;
}

float pattern(vec2 p) {
  vec2 p2 = p - uTime * uSpeed;
  return fbm(p - fbm(p + fbm(p2)));
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  float aspect = uRes.x / uRes.y;

  vec2 uv = cell / uRes - 0.5;
  uv.x *= aspect;

  float f = pattern(uv * uZoom + uShift);

  // The pointer parts the field.
  vec2 m = (uPointer / uRes - 0.5) * vec2(1.0, -1.0);
  m.x *= aspect;
  f -= 0.5 * uPointerOn * (1.0 - smoothstep(0.0, uPointerR, length(uv - m)));

  f *= uGain;

  // Ordered dither to four levels, as the original post-process did it.
  float threshold = texture2D(uBayer, (cell + 0.5) / 8.0).r * (255.0 / 256.0);
  float c = 0.5 * f + (threshold - 0.25) / 3.0;
  c = clamp(c - 0.2, 0.0, 1.0);
  float level = floor(c * 3.0 + 0.5);

  vec3 col = uInk;
  if (level > 0.5) col = uTone1;
  if (level > 1.5) col = uTone2;
  if (level > 2.5) col = uTone3;
  gl_FragColor = vec4(col, 1.0);
}`

export interface FieldOptions {
  /** CSS pixels per dither cell. */
  cell?: number
  /** Scale of the pattern; above 1 shows more of it. */
  zoom?: number
  /** Where in the pattern to look. */
  shift?: [number, number]
  /** How fast it flows. */
  speed?: number
  /** Let the pointer carve the field. */
  pointer?: boolean
  /** Starting density, 0…1. */
  gain?: number
  /** Draw one still frame and stop (reduced motion). */
  still?: boolean
}

export class Field {
  /** Overall density. Tween this to make the field arrive or thin out. */
  gain: number

  private canvas: HTMLCanvasElement
  private host: HTMLElement
  private gl: WebGLRenderingContext | null = null
  private uniforms: Record<string, WebGLUniformLocation | null> = {}
  private opts: Required<FieldOptions>
  private raf = 0
  private running = false
  private onScreen = false
  private wanted = true
  private ticked = 0
  private drawn = 0
  private gainDrawn = -1
  private t0 = performance.now()
  private cols = 2
  private rows = 2
  private px = 2

  private pointer = { x: 0, y: 0, tx: 0, ty: 0, on: 0, target: 0, seen: 0 }
  private cleanup: Array<() => void> = []

  constructor(canvas: HTMLCanvasElement, options: FieldOptions = {}) {
    this.canvas = canvas
    this.host = canvas.parentElement as HTMLElement
    this.opts = {
      cell: CELL,
      zoom: 1,
      shift: [0, 0],
      speed: 0.05,
      pointer: false,
      gain: 1,
      still: false,
      ...options,
    }
    this.gain = this.opts.gain

    if (!this.setup()) {
      document.documentElement.classList.add('no-gl')
      return
    }

    this.resize()

    const ro = new ResizeObserver(() => {
      this.resize()
      this.draw()
    })
    ro.observe(this.host)
    this.cleanup.push(() => ro.disconnect())

    const io = new IntersectionObserver(
      ([entry]) => {
        this.onScreen = entry.isIntersecting
        this.sync()
      },
      { rootMargin: '80px' },
    )
    io.observe(this.host)
    this.cleanup.push(() => io.disconnect())

    const onVisibility = () => this.sync()
    document.addEventListener('visibilitychange', onVisibility)
    this.cleanup.push(() => document.removeEventListener('visibilitychange', onVisibility))

    const onLost = (e: Event) => {
      e.preventDefault()
      this.halt()
    }
    const onRestored = () => {
      if (this.setup()) {
        this.resize()
        this.sync()
      }
    }
    canvas.addEventListener('webglcontextlost', onLost)
    canvas.addEventListener('webglcontextrestored', onRestored)

    if (this.opts.pointer) this.listen()
  }

  get ok() {
    return this.gl !== null
  }

  /** Allow or forbid drawing from outside (e.g. while the hero is covered by the sheet). */
  enable(on: boolean) {
    this.wanted = on
    this.sync()
  }

  destroy() {
    this.halt()
    this.cleanup.forEach((fn) => fn())
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext()
    this.gl = null
  }

  /* Setup ------------------------------------------------------------------- */

  private setup(): boolean {
    const gl = this.canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    })
    if (!gl) return false

    const precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)
    if (!precision || precision.precision === 0) return false

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('[field]', gl.getShaderInfoLog(shader))
        return null
      }
      return shader
    }
    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return false

    const program = gl.createProgram()!
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('[field]', gl.getProgramInfoLog(program))
      return false
    }
    gl.useProgram(program)

    // One triangle that covers the viewport.
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    // The Bayer matrix as an 8×8 texture, value × 4 so that 0…63 fills a byte.
    const bayer = new Uint8Array(64)
    for (let i = 0; i < 64; i++) bayer[i] = BAYER8[i] * 4
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 8, 8, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, bayer)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)

    const names = [
      'uRes', 'uTime', 'uSpeed', 'uZoom', 'uShift', 'uGain', 'uPointer', 'uPointerOn',
      'uPointerR', 'uInk', 'uTone1', 'uTone2', 'uTone3', 'uBayer',
    ]
    this.uniforms = {}
    for (const n of names) this.uniforms[n] = gl.getUniformLocation(program, n)

    const u = this.uniforms
    const unit = (rgb: [number, number, number]) => rgb.map((v) => v / 255) as [number, number, number]
    const ink = unit(token('--ink'))
    const silver = unit(token('--silver'))
    const paper = unit(token('--paper'))
    const between = silver.map((v, i) => v + (paper[i] - v) * 0.62) as [number, number, number]
    gl.uniform3fv(u.uInk, ink)
    gl.uniform3fv(u.uTone1, silver)
    gl.uniform3fv(u.uTone2, between)
    gl.uniform3fv(u.uTone3, paper)
    gl.uniform1i(u.uBayer, 0)
    gl.uniform1f(u.uSpeed, this.opts.speed)
    gl.uniform1f(u.uZoom, this.opts.zoom)
    gl.uniform2fv(u.uShift, this.opts.shift)
    gl.uniform1f(u.uPointerR, 0.3)

    this.gl = gl
    return true
  }

  private resize() {
    const gl = this.gl
    if (!gl) return
    const ratio = dpr()
    this.px = cellDevicePx(this.opts.cell)
    const box = this.host.getBoundingClientRect()
    this.cols = Math.max(2, Math.ceil((box.width * ratio) / this.px))
    this.rows = Math.max(2, Math.ceil((box.height * ratio) / this.px))
    if (this.canvas.width !== this.cols || this.canvas.height !== this.rows) {
      this.canvas.width = this.cols
      this.canvas.height = this.rows
    }
    // A touch larger than its box if need be, so each cell is exactly `px` device pixels.
    this.canvas.style.width = `${(this.cols * this.px) / ratio}px`
    this.canvas.style.height = `${(this.rows * this.px) / ratio}px`
    gl.viewport(0, 0, this.cols, this.rows)
    gl.uniform2f(this.uniforms.uRes, this.cols, this.rows)
  }

  /* Pointer ----------------------------------------------------------------- */

  private listen() {
    const p = this.pointer
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const rect = this.canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height
      p.target = inside ? 1 : 0
      if (!inside) return
      const scale = dpr() / this.px
      p.tx = x * scale
      p.ty = y * scale
      // First contact: start under the pointer rather than sweeping in from a corner.
      if (p.seen === 0) {
        p.x = p.tx
        p.y = p.ty
      }
      p.seen = performance.now()
    }
    const onLeave = () => (p.target = 0)
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    this.cleanup.push(() => {
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    })
  }

  /* Loop -------------------------------------------------------------------- */

  private sync() {
    const should = this.gl !== null && this.wanted && this.onScreen && !document.hidden
    if (should && !this.running) {
      this.running = true
      if (this.opts.still) {
        this.draw()
        this.running = false
        return
      }
      this.raf = requestAnimationFrame(this.tick)
    } else if (!should && this.running) {
      this.halt()
    }
  }

  private halt() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  private tick = () => {
    if (!this.running) return
    this.raf = requestAnimationFrame(this.tick)

    // Everything here is paced by the clock, so a 240 Hz display behaves like a 60 Hz one.
    const now = performance.now()
    const dt = Math.min(64, now - this.ticked)
    this.ticked = now
    const ease = (perFrame: number) => 1 - Math.pow(1 - perFrame, dt / 16.67)

    const p = this.pointer
    p.on += (p.target - p.on) * ease(0.08)
    p.x += (p.tx - p.x) * ease(0.16)
    p.y += (p.ty - p.y) * ease(0.16)

    // The field drifts slowly, so about 30 frames a second is plenty; while the pointer is
    // moving through it, up to 60.
    const lively = p.on > 0.01 && Math.abs(p.target - p.on) + Math.abs(p.tx - p.x) + Math.abs(p.ty - p.y) > 0.02
    if (now - this.drawn < (lively || this.gain !== this.gainDrawn ? 15 : 31)) return
    this.drawn = now
    this.gainDrawn = this.gain

    this.draw()
  }

  private draw() {
    const gl = this.gl
    if (!gl) return
    const u = this.uniforms
    const time = this.opts.still ? 12 : (performance.now() - this.t0) / 1000
    gl.uniform1f(u.uTime, time)
    gl.uniform1f(u.uGain, this.gain)
    gl.uniform2f(u.uPointer, this.pointer.x, this.pointer.y)
    gl.uniform1f(u.uPointerOn, this.pointer.on)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
}
