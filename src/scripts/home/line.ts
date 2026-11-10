import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { DevelopItem } from '../stage/Develop';
import type { Scroll } from '../motion/scroll';

gsap.registerPlugin(ScrollTrigger);

interface Sheet {
  fig: HTMLElement;
  swing: HTMLElement;
  paper: HTMLElement;
  img: HTMLImageElement | null;
  /** The WebGL image, if this sheet has one (frame 06 is unexposed). */
  item: DevelopItem | null;
  seed: number;
  tilt: number; // resting angle, deg
  angle: number; // dynamic swing, deg
  angVel: number;
  hover: number;
  hoverTarget: number;
  develop: number;
  developing: boolean;
  // untransformed offsets, cached on layout
  swingX: number;
  swingY: number;
  swingW: number;
  imgX: number;
  imgY: number;
  imgW: number;
  imgH: number;
  paperX: number;
  paperY: number;
  paperW: number;
  /** Rotated top corners of the paper, viewport px: where the wire meets the sheet. */
  corners: [number, number, number, number];
}

export interface Line {
  items: DevelopItem[];
  update(time: number, dt: number): void;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * The clothesline. Desktop: pinned, scrolls sideways, prints swing on their
 * pegs with the scroll speed and develop as they reach the middle.
 * Mobile and reduced motion: a vertical stack, each print on its own peg.
 */
export function createLine(opts: { reduced: boolean; scroll: Scroll }): Line | null {
  const root = document.querySelector<HTMLElement>('[data-line]');
  if (!root) return null;
  const pin = root.querySelector<HTMLElement>('[data-line-pin]')!;
  const track = root.querySelector<HTMLElement>('[data-line-track]')!;
  const wire = root.querySelector<SVGPathElement>('[data-wire-path]');
  const nail = root.querySelector<SVGCircleElement>('[data-wire-nail]');
  let horizontal = false;
  let pinTrigger: ScrollTrigger | null = null;

  const sheets: Sheet[] = [...root.querySelectorAll<HTMLElement>('[data-print]')].map((fig, i) => {
    const swing = fig.querySelector<HTMLElement>('[data-swing]')!;
    const paper = fig.querySelector<HTMLElement>('[data-paper]')!;
    const img = fig.querySelector<HTMLImageElement>('img');
    const seed = i * 1.731 + 0.37;
    const item: DevelopItem | null = img
      ? { img, seed, progress: opts.reduced ? 1 : 0, hover: 0, visible: false, cx: 0, cy: 0, w: 0, h: 0, rot: 0 }
      : null;
    const s: Sheet = {
      fig,
      swing,
      paper,
      img,
      item,
      seed,
      tilt: parseFloat(fig.style.getPropertyValue('--tilt')) || 0,
      angle: 0,
      angVel: 0,
      hover: 0,
      hoverTarget: 0,
      develop: opts.reduced || !img ? 1 : 0,
      developing: opts.reduced || !img,
      swingX: 0,
      swingY: 0,
      swingW: 0,
      imgX: 0,
      imgY: 0,
      imgW: 0,
      imgH: 0,
      paperX: 0,
      paperY: 0,
      paperW: 0,
      corners: [0, 0, 0, 0],
    };
    const link = fig.querySelector<HTMLElement>('a') ?? paper;
    link.addEventListener('pointerenter', () => (s.hoverTarget = 1));
    link.addEventListener('pointerleave', () => (s.hoverTarget = 0));
    link.addEventListener('focus', () => {
      s.hoverTarget = 1;
      bringIntoView(s);
    });
    link.addEventListener('blur', () => (s.hoverTarget = 0));
    if (s.develop === 1) fig.style.setProperty('--dev', '1');
    return s;
  });

  // Keyboard users tab along the line: scroll the page so the focused print is centred.
  const bringIntoView = (s: Sheet) => {
    if (!horizontal || !pinTrigger) return;
    const vw = document.documentElement.clientWidth;
    const distance = pinTrigger.end - pinTrigger.start;
    const fromLeft = s.fig.offsetLeft + s.fig.offsetWidth / 2 - vw / 2;
    const target = pinTrigger.start + clamp(fromLeft, 0, distance);
    opts.scroll.to(target);
  };

  // Offsets are not affected by transforms, so they give the resting layout.
  const measure = () => {
    for (const s of sheets) {
      s.swingX = s.swing.offsetLeft;
      s.swingY = s.swing.offsetTop;
      s.swingW = s.swing.offsetWidth;
      s.paperX = s.paper.offsetLeft;
      s.paperY = s.paper.offsetTop;
      s.paperW = s.paper.offsetWidth;
      if (s.img) {
        s.imgX = s.paperX + s.paper.clientLeft + s.img.offsetLeft;
        s.imgY = s.paperY + s.paper.clientTop + s.img.offsetTop;
        s.imgW = s.img.offsetWidth;
        s.imgH = s.img.offsetHeight;
      }
    }
  };

  // The wire is drawn only between sheets: it disappears behind each one at its top corners.
  const drawWire = (trackRect: DOMRect, sag: number) => {
    if (!wire || !sheets.length) return;
    const ox = trackRect.left;
    const oy = trackRect.top;
    const seg = (x1: number, y1: number, x2: number, y2: number) => {
      const my = Math.max(y1, y2) + Math.min(60, Math.abs(x2 - x1) * 0.06) + sag;
      return `M ${(x1 - ox).toFixed(1)} ${(y1 - oy).toFixed(1)} Q ${((x1 + x2) / 2 - ox).toFixed(1)} ${(my - oy).toFixed(1)} ${(x2 - ox).toFixed(1)} ${(y2 - oy).toFixed(1)}`;
    };
    const first = sheets[0]!.corners;
    const last = sheets[sheets.length - 1]!.corners;
    // The wire starts at a nail just left of the first print, clear of the heading.
    const nx = first[0] - 120;
    const ny = first[1] - 26;
    nail?.setAttribute('cx', (nx - ox).toFixed(1));
    nail?.setAttribute('cy', (ny - oy).toFixed(1));
    let d = seg(nx, ny, first[0], first[1]);
    for (let i = 0; i < sheets.length - 1; i++) {
      const a = sheets[i]!.corners;
      const b = sheets[i + 1]!.corners;
      d += ' ' + seg(a[2], a[3], b[0], b[1]);
    }
    d += ' ' + seg(last[2], last[3], last[2] + 1400, last[3] - 60);
    wire.setAttribute('d', d);
  };

  const mm = gsap.matchMedia();
  mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
    horizontal = true;
    document.documentElement.classList.add('line-h');
    const distance = () => Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
      },
    });
    pinTrigger = tween.scrollTrigger ?? null;
    requestAnimationFrame(measure);
    return () => {
      horizontal = false;
      pinTrigger = null;
      document.documentElement.classList.remove('line-h');
      tween.scrollTrigger?.kill();
      tween.kill();
      gsap.set(track, { clearProps: 'transform' });
    };
  });
  ScrollTrigger.addEventListener('refresh', measure);
  window.addEventListener('load', measure);
  measure();

  let lastWire = 0;
  const update = (time: number, dt: number) => {
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const step = dt * 60;
    const velocity = opts.scroll.velocity();

    // Far off screen: hide the WebGL prints and skip all layout work.
    const zone = root.getBoundingClientRect();
    if (zone.bottom < -vh || zone.top > vh * 2) {
      for (const s of sheets) if (s.item) s.item.visible = false;
      return;
    }

    // Read every rect first, then write, so layout is not thrashed.
    const rects = sheets.map((s) => s.fig.getBoundingClientRect());
    const trackRect = horizontal ? track.getBoundingClientRect() : null;

    sheets.forEach((s, i) => {
      const r = rects[i]!;
      const visible = r.right > -200 && r.left < vw + 200 && r.bottom > -300 && r.top < vh + 300;

      // Develop once the print nears the middle of the view. It never un-develops.
      const centre = horizontal
        ? Math.abs(r.left + r.width / 2 - vw / 2) / (vw / 2)
        : Math.abs(r.top + r.height / 2 - vh / 2) / (vh / 2);
      if (!s.developing && centre < 0.85) s.developing = true;
      if (s.developing && s.develop < 1) {
        s.develop = Math.min(1, s.develop + dt / 2);
        // The paper border turns white with the colour phase of the shader (0.72 -> 1).
        const c = clamp((s.develop - 0.72) / 0.28, 0, 1);
        s.fig.style.setProperty('--dev', (c * c * (3 - 2 * c)).toFixed(3));
      }

      s.hover += (s.hoverTarget - s.hover) * (1 - Math.pow(0.82, step));
      let angle = s.tilt;
      let scale = 1;
      let lift = 0;
      if (!opts.reduced) {
        // Pendulum on a spring: the line's speed pushes it, damping settles it.
        const push = clamp((horizontal ? velocity * 0.5 : velocity * 0.16) * (1 - s.hover * 0.85), -14, 14);
        const idle = Math.sin(time * 0.8 + s.seed * 3) * 0.7 * (1 - s.hover);
        s.angVel += (push + idle - s.angle) * 0.045 * step;
        s.angVel *= Math.pow(0.9, step);
        s.angle += s.angVel * step;
        angle = s.tilt * (1 - s.hover) + s.angle;
        scale = 1 + s.hover * 0.035;
        lift = -s.hover * 8;
        s.swing.style.transform = `translate3d(0, ${lift.toFixed(2)}px, 0) rotate(${angle.toFixed(3)}deg) scale(${scale.toFixed(4)})`;
      }

      // Same transform for the WebGL image and the wire: pivot at the peg (top centre).
      const rot = (angle * Math.PI) / 180;
      const c = Math.cos(rot);
      const sn = Math.sin(rot);
      const px = r.left + s.swingX + s.swingW / 2;
      const py = r.top + s.swingY + lift;
      const left = (s.paperX - s.swingW / 2) * scale;
      const right = left + s.paperW * scale;
      const top = s.paperY * scale;
      s.corners = [px + left * c - top * sn, py + left * sn + top * c, px + right * c - top * sn, py + right * sn + top * c];

      if (s.item) {
        const lx = (s.imgX + s.imgW / 2 - s.swingW / 2) * scale;
        const ly = (s.imgY + s.imgH / 2) * scale;
        s.item.visible = visible;
        s.item.cx = px + lx * c - ly * sn;
        s.item.cy = py + lx * sn + ly * c;
        s.item.w = s.imgW * scale;
        s.item.h = s.imgH * scale;
        s.item.rot = rot;
        s.item.progress = s.develop;
        s.item.hover = s.hover;
      }
    });

    if (trackRect && time - lastWire > 1 / 40) {
      lastWire = time;
      drawWire(trackRect, clamp(Math.abs(velocity) * 0.9, 0, 26));
    }
  };

  return { items: sheets.flatMap((s) => (s.item ? [s.item] : [])), update };
}
