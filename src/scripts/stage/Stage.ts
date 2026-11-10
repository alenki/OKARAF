import { Camera, Renderer, Transform } from 'ogl';
import type { OGLRenderingContext } from 'ogl';

export interface Layer {
  resize?(width: number, height: number): void;
  update?(time: number, dt: number): void;
}

export const GLSL_HEADER = '#version 300 es\nprecision highp float;\nprecision highp int;\n';

/**
 * One fixed, transparent WebGL canvas behind the page. World units are CSS
 * pixels with the origin at the viewport's top-left (y grows downward on
 * screen, so meshes are placed at (x, -y)).
 */
export class Stage {
  readonly renderer: Renderer;
  readonly gl: OGLRenderingContext;
  readonly camera: Camera;
  readonly scene = new Transform();
  readonly dpr: number;
  /** Can we render into half-float targets (needed for the ripple simulation)? */
  readonly floatTargets: boolean;
  width = 0;
  height = 0;
  private layers: Layer[] = [];

  /** Returns null when WebGL2 is unavailable, so callers can fall back to CSS. */
  static create(canvas: HTMLCanvasElement): Stage | null {
    // Software-rendered WebGL would cost more than the effect is worth: use the CSS fallback.
    const probe = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    if (!probe) return null;
    probe.getExtension('WEBGL_lose_context')?.loseContext();
    try {
      const stage = new Stage(canvas);
      return stage.renderer.isWebgl2 ? stage : null;
    } catch {
      return null;
    }
  }

  private constructor(canvas: HTMLCanvasElement) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    this.renderer = new Renderer({
      canvas,
      dpr: this.dpr,
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
      webgl: 2,
    });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    this.floatTargets = !!this.gl.getExtension('EXT_color_buffer_float');
    this.camera = new Camera(this.gl, { left: 0, right: 1, top: 0, bottom: -1, near: 0.1, far: 100 });
    this.camera.position.z = 10;
    this.resize();
  }

  /**
   * Compile shaders without blocking the main thread (KHR_parallel_shader_compile),
   * then throw them away: the browser keeps the linked binaries, so the real
   * programs built from the same sources link almost instantly.
   */
  async prewarm(sources: { vertex: string; fragment: string }[]) {
    const gl = this.gl as WebGL2RenderingContext;
    const ext = gl.getExtension('KHR_parallel_shader_compile') as { COMPLETION_STATUS_KHR: number } | null;
    if (!ext) return;
    const made = sources.map(({ vertex, fragment }) => {
      const v = gl.createShader(gl.VERTEX_SHADER)!;
      gl.shaderSource(v, vertex);
      gl.compileShader(v);
      const f = gl.createShader(gl.FRAGMENT_SHADER)!;
      gl.shaderSource(f, fragment);
      gl.compileShader(f);
      const program = gl.createProgram()!;
      gl.attachShader(program, v);
      gl.attachShader(program, f);
      gl.linkProgram(program);
      return { v, f, program };
    });
    const done = () => made.every(({ program }) => gl.getProgramParameter(program, ext.COMPLETION_STATUS_KHR));
    const started = performance.now();
    while (!done() && performance.now() - started < 4000) await new Promise((r) => setTimeout(r, 20));
    for (const { v, f, program } of made) {
      gl.deleteProgram(program);
      gl.deleteShader(v);
      gl.deleteShader(f);
    }
  }

  add(layer: Layer) {
    this.layers.push(layer);
    layer.resize?.(this.width, this.height);
  }

  resize() {
    this.width = document.documentElement.clientWidth;
    this.height = window.innerHeight;
    this.renderer.setSize(this.width, this.height);
    this.camera.orthographic({ left: 0, right: this.width, top: 0, bottom: -this.height, near: 0.1, far: 100 });
    for (const layer of this.layers) layer.resize?.(this.width, this.height);
  }

  render(time: number, dt: number) {
    for (const layer of this.layers) layer.update?.(time, dt);
    this.renderer.render({ scene: this.scene, camera: this.camera });
  }
}
