import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { boot } from '../app';

gsap.registerPlugin(ScrollTrigger);

const app = boot();

// The cover arrives already developed (it was developed on the line); the rest reveals in.
gsap.fromTo(
  '[data-reveal]',
  { autoAlpha: 0, y: app.reduced ? 0 : 24 },
  { autoAlpha: 1, y: 0, duration: app.reduced ? 0.2 : 1, ease: 'expo.out', stagger: 0.07, delay: 0.15 },
);

/**
 * Next print: press and hold to pull it out of the tray. A plain click or the
 * keyboard (click with detail 0) still navigates straight away.
 */
const hold = document.querySelector<HTMLAnchorElement>('[data-hold]');
if (hold) {
  const bar = hold.querySelector<HTMLElement>('[data-hold-bar]');
  const title = hold.querySelector<HTMLElement>('[data-hold-title]');
  const state = { p: 0 };
  let tween: gsap.core.Tween | null = null;
  let pulled = false;
  const render = () => {
    if (bar) bar.style.transform = `scaleX(${state.p.toFixed(4)})`;
    if (title && !app.reduced) title.style.transform = `translate3d(0, ${(-state.p * 18).toFixed(2)}px, 0)`;
  };
  const start = (e: PointerEvent) => {
    if (e.button !== 0) return;
    tween?.kill();
    tween = gsap.to(state, {
      p: 1,
      duration: 0.9 * (1 - state.p),
      ease: 'power1.in',
      onUpdate: render,
      onComplete: () => {
        pulled = true;
        location.assign(hold.href);
      },
    });
  };
  const cancel = () => {
    if (pulled) return;
    tween?.kill();
    tween = gsap.to(state, { p: 0, duration: 0.35, ease: 'power2.out', onUpdate: render });
  };
  hold.addEventListener('pointerdown', start);
  hold.addEventListener('pointerup', cancel);
  hold.addEventListener('pointerleave', cancel);
  hold.addEventListener('pointercancel', cancel);
  hold.addEventListener('click', (e) => {
    // Mouse and touch must hold; keyboard activation (detail === 0) goes straight through.
    if (e.detail !== 0) e.preventDefault();
  });
}
