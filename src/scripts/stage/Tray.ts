import { Mesh, Plane, Program, RenderTarget, Texture, Triangle } from 'ogl';
import { GLSL_HEADER, type Layer, type Stage } from './Stage';
import { drawLatent } from './latent';
import { mixLook, type TrayLook } from '../theme';
import noise from './shaders/noise.glsl?raw';
import dither from './shaders/dither.glsl?raw';
import fullscreenVert from './shaders/fullscreen.vert?raw';
import planeVert from './shaders/plane.vert?raw';
import fieldFrag from './shaders/field.frag?raw';
import rippleFrag from './shaders/ripple.frag?raw';
import trayFrag from './shaders/tray.frag?raw';

const vert = (src: string) => GLSL_HEADER + src;
// Each shader only includes the chunks it uses: shorter compiles on first load.
const frag = (src: string, ...chunks: string[]) => `${GLSL_HEADER}${chunks.join('\n')}\n${src}`;

/** The exact sources the tray compiles, for Stage.prewarm. */
export const TRAY_SHADERS = [
  { vertex: vert(fullscreenVert), fragment: frag(fieldFrag, noise) },
  { vertex: vert(fullscreenVert), fragment: frag(rippleFrag) },
  { vertex: vert(planeVert), fragment: frag(trayFrag, dither) },
];

export interface TrayOptions {
  hero: HTMLElement;
  sheet: HTMLElement;
  look: TrayLook;
  /** Print marks drawn on the sheet around the name. */
  subtitle: string;
  corners: [string, string, string, string];
}

/**
 * The hero: a sheet developing in a tray. Three passes per frame:
 * the old wave field (quarter res), two ripple steps, then the composite plane.
 */
export class Tray implements Layer {
  /** Animated from outside (GSAP): develop progress and safelight warm-up. */
  readonly state = { progress: 0, glow: 0 };

  private readonly mesh: Mesh;
  private readonly program: Program;
  private readonly fieldMesh: Mesh;
  private readonly fieldTarget: RenderTarget;
  private readonly rippleMesh: Mesh | null = null;
  private readonly rippleProgram: Program | null = null;
  private rippleRead: RenderTarget | null = null;
  private rippleWrite: RenderTarget | null = null;
  private readonly flat: Texture;
  private readonly latentCanvas = document.createElement('canvas');
  private readonly latent: Texture;

  private look: TrayLook;
  private lookFrom: TrayLook;
  private lookTo: TrayLook;
  private lookT = 1;

  private rect = { left: 0, top: 0, width: 1, height: 1 };
  private mouse = { x: -9999, y: -9999, prevX: -9999, prevY: -9999, force: 0, has: false };
  private drop: [number, number, number] = [0, 0, 0];
  private nextDrip = 3;

  constructor(
    private readonly stage: Stage,
    private readonly opts: TrayOptions,
  ) {
    const gl = stage.gl;
    this.look = this.lookFrom = this.lookTo = opts.look;
    const triangle = new Triangle(gl);
    const linear = { minFilter: gl.LINEAR, magFilter: gl.LINEAR, depth: false };

    // Old wave field. 8-bit is enough: it only seeds where development starts.
    this.fieldTarget = new RenderTarget(gl, { width: 64, height: 64, ...linear });
    this.fieldMesh = new Mesh(gl, {
      geometry: triangle,
      program: new Program(gl, {
        vertex: TRAY_SHADERS[0]!.vertex,
        fragment: TRAY_SHADERS[0]!.fragment,
        uniforms: { uRes: { value: [1, 1] }, uTime: { value: 0 } },
        depthTest: false,
        depthWrite: false,
      }),
    });

    // Ripple simulation (needs half-float targets); a flat surface otherwise.
    this.flat = new Texture(gl, {
      image: new Uint8Array([0, 0, 0, 255]),
      width: 1,
      height: 1,
      generateMipmaps: false,
      flipY: false,
    });
    if (stage.floatTargets) {
      const gl2 = gl as WebGL2RenderingContext;
      const rt = () =>
        new RenderTarget(gl, { width: 64, height: 64, type: gl2.HALF_FLOAT, internalFormat: gl2.RGBA16F, format: gl.RGBA, ...linear });
      this.rippleRead = rt();
      this.rippleWrite = rt();
      this.rippleProgram = new Program(gl, {
        vertex: TRAY_SHADERS[1]!.vertex,
        fragment: TRAY_SHADERS[1]!.fragment,
        uniforms: {
          uState: { value: this.rippleRead.texture },
          uTexel: { value: [1 / 64, 1 / 64] },
          uAspect: { value: 1 },
          uMouse: { value: [-1, -1] },
          uMousePrev: { value: [-1, -1] },
          uMouseForce: { value: 0 },
          uDrop: { value: [0, 0, 0] },
          uDropRadius: { value: 0.05 },
          uDamping: { value: 0.986 },
        },
        depthTest: false,
        depthWrite: false,
      });
      this.rippleMesh = new Mesh(gl, { geometry: triangle, program: this.rippleProgram });
    }

    this.latent = new Texture(gl, {
      image: this.latentCanvas,
      generateMipmaps: false,
      flipY: false,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
    });

    this.program = new Program(gl, {
      vertex: TRAY_SHADERS[2]!.vertex,
      fragment: TRAY_SHADERS[2]!.fragment,
      uniforms: {
        uState: { value: this.rippleRead ? this.rippleRead.texture : this.flat },
        uField: { value: this.fieldTarget.texture },
        uLatent: { value: this.latent },
        uSize: { value: [1, 1] },
        uSimTexel: { value: [1 / 64, 1 / 64] },
        uSheet: { value: [0, 0, 1, 1] },
        uAngle: { value: 0 },
        uProgress: { value: 0 },
        uPixel: { value: Math.max(2, Math.round(stage.dpr * 1.5)) },
        uBg: { value: [0, 0, 0] },
        uPageBg: { value: [0, 0, 0] },
        uPaper: { value: [1, 1, 1] },
        uInk: { value: [0, 0, 0] },
        uLight: { value: [1, 1, 1] },
        uLightAmt: { value: 0 },
        uGlow: { value: 0 },
        uFog: { value: 0 },
        uVignette: { value: 0 },
        uShadow: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
      cullFace: false,
    });
    this.applyLook();
    this.mesh = new Mesh(gl, { geometry: new Plane(gl), program: this.program, renderOrder: 0 });
    this.mesh.frustumCulled = false;
    this.mesh.setParent(stage.scene);

    window.addEventListener('pointermove', this.onPointer, { passive: true });
    window.addEventListener('pointerdown', this.onPointerDown, { passive: true });
    this.layout();
  }

  /** Re-measure the hero and sheet, resize targets, redraw the latent image. */
  layout() {
    const { hero, sheet } = this.opts;
    const w = hero.offsetWidth;
    const h = hero.offsetHeight;
    const u = this.program.uniforms;
    u.uSize.value = [w, h];
    u.uSheet.value = [
      sheet.offsetLeft + sheet.offsetWidth / 2,
      sheet.offsetTop + sheet.offsetHeight / 2,
      sheet.offsetWidth,
      sheet.offsetHeight,
    ];
    const angle = parseFloat(getComputedStyle(sheet).getPropertyValue('--sheet-angle')) || 0;
    u.uAngle.value = (angle * Math.PI) / 180;

    this.fieldTarget.setSize(Math.max(32, Math.round(w / 4)), Math.max(32, Math.round(h / 4)));
    this.fieldMesh.program.uniforms.uRes.value = [w, h];

    if (this.rippleRead && this.rippleWrite && this.rippleProgram) {
      const simW = Math.round(Math.min(480, Math.max(160, w / 3.2)));
      const simH = Math.max(32, Math.round((simW * h) / w));
      this.rippleRead.setSize(simW, simH);
      this.rippleWrite.setSize(simW, simH);
      this.rippleProgram.uniforms.uTexel.value = [1 / simW, 1 / simH];
      this.rippleProgram.uniforms.uAspect.value = simW / simH;
      u.uSimTexel.value = [1 / simW, 1 / simH];
    }

    drawLatent(this.latentCanvas, {
      width: sheet.offsetWidth,
      height: sheet.offsetHeight,
      dpr: this.stage.dpr,
      lines: w < 768 ? ['OMAR', 'KARAF'] : ['OMAR KARAF'],
      subtitle: this.opts.subtitle,
      corners: this.opts.corners,
    });
    this.latent.image = this.latentCanvas;
    this.latent.needsUpdate = true;
  }

  resize() {
    this.layout();
  }

  /** Blend to another look (Safelight <-> Lights) over 0.8s. */
  setLook(look: TrayLook) {
    this.lookFrom = this.look;
    this.lookTo = look;
    this.lookT = 0;
  }

  /** A drop into the liquid at a point in hero uv (0..1, y down). */
  splash(x: number, y: number, strength = 1) {
    this.drop = [x, 1 - y, strength];
  }

  private applyLook() {
    const l = this.look;
    const u = this.program.uniforms;
    u.uBg.value = l.bg;
    u.uPageBg.value = l.pageBg;
    u.uPaper.value = l.paper;
    u.uInk.value = l.ink;
    u.uLight.value = l.light;
    u.uLightAmt.value = l.lightAmt;
    u.uFog.value = l.fog;
    u.uVignette.value = l.vignette;
    u.uShadow.value = l.shadow;
  }

  private onPointer = (e: PointerEvent) => {
    this.mouse.x = e.clientX - this.rect.left;
    this.mouse.y = e.clientY - this.rect.top;
    this.mouse.has = true;
  };

  private onPointerDown = (e: PointerEvent) => {
    const x = (e.clientX - this.rect.left) / this.rect.width;
    const y = (e.clientY - this.rect.top) / this.rect.height;
    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) this.splash(x, y, 0.9);
  };

  update(time: number, dt: number) {
    const r = this.opts.hero.getBoundingClientRect();
    this.rect = { left: r.left, top: r.top, width: r.width, height: r.height };
    const visible = r.bottom > 0 && r.top < this.stage.height;
    this.mesh.visible = visible;
    if (!visible) return;

    if (this.lookT < 1) {
      this.lookT = Math.min(1, this.lookT + dt / 0.8);
      const t = this.lookT * this.lookT * (3 - 2 * this.lookT);
      this.look = mixLook(this.lookFrom, this.lookTo, t);
      this.applyLook();
    }

    const renderer = this.stage.renderer;
    this.fieldMesh.program.uniforms.uTime.value = time;
    renderer.render({ scene: this.fieldMesh, target: this.fieldTarget });

    if (this.rippleMesh && this.rippleProgram && this.rippleRead && this.rippleWrite) {
      const m = this.mouse;
      const ru = this.rippleProgram.uniforms;
      if (m.has) {
        const speed = m.prevX < -9000 ? 0 : Math.hypot(m.x - m.prevX, m.y - m.prevY);
        m.force = Math.min(0.55, speed * 0.02);
        ru.uMousePrev.value = [m.prevX / r.width, 1 - m.prevY / r.height];
        ru.uMouse.value = [m.x / r.width, 1 - m.y / r.height];
        m.prevX = m.x;
        m.prevY = m.y;
      }

      // Darkroom drips keep the surface alive when nobody is touching it.
      this.nextDrip -= dt;
      if (this.nextDrip <= 0) {
        this.nextDrip = 2.5 + Math.random() * 3.5;
        if (this.drop[2] === 0) this.drop = [0.1 + Math.random() * 0.8, 0.15 + Math.random() * 0.7, 0.35];
      }

      for (let step = 0; step < 2; step++) {
        ru.uState.value = this.rippleRead.texture;
        ru.uMouseForce.value = step === 0 ? m.force : 0;
        ru.uDrop.value = step === 0 ? this.drop : [0, 0, 0];
        renderer.render({ scene: this.rippleMesh, target: this.rippleWrite });
        [this.rippleRead, this.rippleWrite] = [this.rippleWrite, this.rippleRead];
      }
      this.drop = [0, 0, 0];
      m.force = 0;
      this.program.uniforms.uState.value = this.rippleRead.texture;
    }

    const u = this.program.uniforms;
    u.uProgress.value = this.state.progress;
    u.uGlow.value = this.state.glow * this.look.glow;
    this.mesh.position.set(r.left + r.width / 2, -(r.top + r.height / 2), 0);
    this.mesh.scale.set(r.width, r.height, 1);
  }
}
