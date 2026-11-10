import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { boot } from '../app';

gsap.registerPlugin(ScrollTrigger);

const app = boot();

gsap.fromTo(
  '[data-reveal]',
  { autoAlpha: 0, y: app.reduced ? 0 : 20 },
  { autoAlpha: 1, y: 0, duration: app.reduced ? 0.2 : 1, ease: 'expo.out', stagger: 0.06, delay: 0.1 },
);

// Grease-pencil marks draw themselves around the picks once the sheet is in view.
for (const mark of document.querySelectorAll<SVGPathElement>('[data-grease]')) {
  const length = mark.getTotalLength();
  mark.style.strokeDasharray = `${length}`;
  mark.style.strokeDashoffset = app.reduced ? '0' : `${length}`;
  if (app.reduced) continue;
  gsap.to(mark, {
    strokeDashoffset: 0,
    duration: 1.1,
    ease: 'power2.inOut',
    scrollTrigger: { trigger: mark.closest('[data-frame]') ?? mark, start: 'top 75%' },
  });
}

// The loupe: a photographer's magnifier over the contact sheet (mouse only).
const grid = document.querySelector<HTMLElement>('[data-sheet-grid]');
const loupe = document.querySelector<HTMLElement>('[data-loupe]');
if (grid && loupe && matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const ZOOM = 2.6;
  let current: HTMLImageElement | null = null;
  grid.addEventListener('pointermove', (e) => {
    const img = (e.target as Element).closest('[data-frame]')?.querySelector<HTMLImageElement>('img') ?? null;
    if (!img) {
      loupe.classList.remove('is-on');
      app.cursor?.setHidden(false);
      current = null;
      return;
    }
    const r = img.getBoundingClientRect();
    if (img !== current) {
      current = img;
      loupe.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
      loupe.style.backgroundSize = `${r.width * ZOOM}px ${r.height * ZOOM}px`;
    }
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const size = loupe.offsetWidth;
    loupe.style.backgroundPosition = `${-(x * ZOOM - size / 2)}px ${-(y * ZOOM - size / 2)}px`;
    loupe.style.transform = `translate3d(${e.clientX - size / 2}px, ${e.clientY - size / 2}px, 0)`;
    loupe.classList.add('is-on');
    app.cursor?.setHidden(true);
  });
  grid.addEventListener('pointerleave', () => {
    loupe.classList.remove('is-on');
    app.cursor?.setHidden(false);
    current = null;
  });
}
