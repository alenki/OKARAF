import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export interface Scroll {
  lenis: Lenis | null;
  /** Scroll speed in px per frame (signed). 0 without smooth scroll. */
  velocity(): number;
  toTop(immediate?: boolean): void;
  to(target: number | HTMLElement): void;
}

/** Lenis driven by GSAP's ticker, as in the old src/js/lenis.js. Native scroll when motion is reduced. */
export function initScroll(reduced: boolean): Scroll {
  if (reduced) {
    return {
      lenis: null,
      velocity: () => 0,
      toTop: () => window.scrollTo(0, 0),
      to: (target) => (typeof target === 'number' ? window.scrollTo(0, target) : target.scrollIntoView()),
    };
  }
  const lenis = new Lenis({ lerp: 0.1, anchors: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return {
    lenis,
    velocity: () => lenis.velocity,
    toTop: (immediate = false) => lenis.scrollTo(0, { immediate }),
    to: (target) => lenis.scrollTo(target),
  };
}
