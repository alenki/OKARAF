import { Mesh, Plane, Program, Texture } from 'ogl';
import { GLSL_HEADER, type Layer, type Stage } from './Stage';
import { mixLook, type PrintLook } from '../theme';
import dither from './shaders/dither.glsl?raw';
import planeVert from './shaders/plane.vert?raw';
import printFrag from './shaders/print.frag?raw';

/**
 * Anything that develops: its owner writes screen geometry (viewport px, CSS
 * rotation in radians) and progress every frame; the layer draws it.
 */
export interface DevelopItem {
  img: HTMLImageElement;
  seed: number;
  progress: number;
  hover: number;
  visible: boolean;
  cx: number;
  cy: number;
  w: number;
  h: number;
  rot: number;
}

/** The exact source every developing image uses, for Stage.prewarm. */
export const DEVELOP_SHADER = { vertex: GLSL_HEADER + planeVert, fragment: `${GLSL_HEADER}${dither}
${printFrag}` };

interface Entry {
  item: DevelopItem;
  mesh: Mesh;
  texture: Texture;
  image: [number, number];
  ready: number;
}

/**
 * Every developing image shares one program (one shader compile); per-image
 * uniforms are set just before each mesh draws.
 */
export class DevelopLayer implements Layer {
  private readonly entries: Entry[] = [];
  private readonly geometry: Plane;
  private program: Program | null = null;
  private look: PrintLook;
  private lookFrom: PrintLook;
  private lookTo: PrintLook;
  private lookT = 1;

  constructor(
    private readonly stage: Stage,
    look: PrintLook,
  ) {
    this.geometry = new Plane(stage.gl);
    this.look = this.lookFrom = this.lookTo = look;
  }

  /** Compiled on first use, so pages without visible prints never pay for it. */
  private getProgram(): Program {
    if (this.program) return this.program;
    this.program = new Program(this.stage.gl, {
      vertex: DEVELOP_SHADER.vertex,
      fragment: DEVELOP_SHADER.fragment,
      uniforms: {
        uTex: { value: null },
        uSize: { value: [1, 1] },
        uImage: { value: [1, 1] },
        uReady: { value: 0 },
        uProgress: { value: 0 },
        uHover: { value: 0 },
        uPixel: { value: Math.max(2, Math.round(this.stage.dpr * 1.5)) },
        uSeed: { value: 0 },
        uPaper: { value: this.look.paper },
        uInk: { value: this.look.ink },
      },
      depthTest: false,
      depthWrite: false,
      cullFace: false,
    });
    return this.program;
  }

  add(item: DevelopItem) {
    const gl = this.stage.gl;
    const texture = new Texture(gl, { generateMipmaps: false, flipY: false, minFilter: gl.LINEAR, magFilter: gl.LINEAR });
    const entry: Entry = { item, mesh: null as unknown as Mesh, texture, image: [1, 1], ready: 0 };

    const upload = () => {
      texture.image = item.img;
      texture.needsUpdate = true;
      entry.image = [item.img.naturalWidth, item.img.naturalHeight];
      entry.ready = 1;
    };
    if (item.img.complete && item.img.naturalWidth) upload();
    else item.img.addEventListener('load', upload, { once: true });

    this.entries.push(entry);
  }

  private createMesh(entry: Entry) {
    const program = this.getProgram();
    const mesh = new Mesh(this.stage.gl, { geometry: this.geometry, program, renderOrder: 2 });
    mesh.frustumCulled = false;
    mesh.setParent(this.stage.scene);
    mesh.onBeforeRender(() => {
      const u = program.uniforms;
      const m = entry.item;
      u.uTex.value = entry.texture;
      u.uImage.value = entry.image;
      u.uReady.value = entry.ready;
      u.uSize.value = [m.w + 1, m.h + 1];
      u.uProgress.value = m.progress;
      u.uHover.value = m.hover;
      u.uSeed.value = m.seed;
    });
    entry.mesh = mesh;
  }

  setLook(look: PrintLook) {
    this.lookFrom = this.look;
    this.lookTo = look;
    this.lookT = 0;
  }

  update(_time: number, dt: number) {
    if (this.lookT < 1) {
      this.lookT = Math.min(1, this.lookT + dt / 0.8);
      const t = this.lookT * this.lookT * (3 - 2 * this.lookT);
      this.look = mixLook(this.lookFrom, this.lookTo, t);
      if (this.program) {
        this.program.uniforms.uPaper.value = this.look.paper;
        this.program.uniforms.uInk.value = this.look.ink;
      }
    }
    for (const entry of this.entries) {
      const m = entry.item;
      if (!entry.mesh) {
        if (!m.visible) continue;
        this.createMesh(entry);
      }
      entry.mesh.visible = m.visible;
      if (!m.visible) continue;
      // 1px of bleed so no seam shows between the image and its paper border.
      entry.mesh.position.set(m.cx, -m.cy, 0);
      entry.mesh.rotation.z = -m.rot;
      entry.mesh.scale.set(m.w + 1, m.h + 1, 1);
    }
  }
}

/**
 * The simple case: an image that develops once it is well inside the viewport.
 * Without WebGL the same progress drives a CSS fallback through --dev.
 */
export function trackImage(img: HTMLImageElement, seed: number, opts: { duration?: number; threshold?: number } = {}) {
  const duration = opts.duration ?? 2;
  const threshold = opts.threshold ?? 0.8;
  const item: DevelopItem = { img, seed, progress: 0, hover: 0, visible: false, cx: 0, cy: 0, w: 0, h: 0, rot: 0 };
  let started = false;
  return {
    item,
    update(dt: number, vw: number, vh: number) {
      const r = img.getBoundingClientRect();
      item.visible = r.bottom > -100 && r.top < vh + 100 && r.right > -100 && r.left < vw + 100;
      item.cx = r.left + r.width / 2;
      item.cy = r.top + r.height / 2;
      item.w = r.width;
      item.h = r.height;
      if (!started && r.top < vh * threshold && r.bottom > vh * (1 - threshold)) started = true;
      if (started && item.progress < 1) {
        item.progress = Math.min(1, item.progress + dt / duration);
        img.style.setProperty('--dev', item.progress.toFixed(3));
      }
    },
    developNow() {
      started = true;
      item.progress = 1;
      img.style.setProperty('--dev', '1');
    },
  };
}
