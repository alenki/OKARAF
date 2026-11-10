import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Stage } from './stage/Stage';
import { DevelopLayer, trackImage } from './stage/Develop';
import { initScroll, type Scroll } from './motion/scroll';
import { initCursor, type Cursor } from './ui/cursor';
import { makeGrain } from './ui/grain';
import { initNav } from './ui/nav';
import { initClock, initCopy, initEasterEggs, initMarquee, initTimer } from './ui/misc';
import { LOOKS, getTheme, type Theme } from './theme';
import { site } from '../data/site';

gsap.registerPlugin(ScrollTrigger);

export interface App {
  reduced: boolean;
  scroll: Scroll;
  stage: Stage | null;
  develop: DevelopLayer | null;
  cursor: Cursor | null;
  /** Called every frame before the stage renders. */
  onFrame(fn: (time: number, dt: number) => void): void;
  /** Called when the visitor switches Safelight <-> Lights. */
  onTheme(fn: (theme: Theme) => void): void;
  viewport: { width: number; height: number };
}

/** Everything every page shares: scroll, the WebGL stage, cursor, nav, footer. */
export function boot(): App {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (import.meta.env.DEV) Object.assign(window, { __ST: ScrollTrigger });

  makeGrain();
  const scroll = initScroll(reduced);
  const canvas = document.querySelector<HTMLCanvasElement>('[data-stage]');
  const stage = !reduced && canvas ? Stage.create(canvas) : null;
  root.classList.add(stage ? 'gl' : 'no-gl');

  const develop = stage ? new DevelopLayer(stage, LOOKS[getTheme()].print) : null;
  if (stage && develop) stage.add(develop);

  const viewport = { width: root.clientWidth, height: window.innerHeight };
  const frames: ((time: number, dt: number) => void)[] = [];
  const themeListeners: ((theme: Theme) => void)[] = [];

  gsap.ticker.add((time, deltaMs) => {
    const dt = Math.min(deltaMs / 1000, 1 / 20);
    for (const fn of frames) fn(time, dt);
    stage?.render(time, dt);
  });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    viewport.width = root.clientWidth;
    viewport.height = window.innerHeight;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => stage?.resize(), 120);
  });

  window.addEventListener('okaraf:theme', (e) => {
    const theme = (e as CustomEvent<Theme>).detail;
    develop?.setLook(LOOKS[theme].print);
    for (const fn of themeListeners) fn(theme);
  });

  // Any image marked data-develop develops once it's well inside the viewport.
  [...document.querySelectorAll<HTMLImageElement>('img[data-develop]')].forEach((img, i) => {
    const tracked = trackImage(img, 11.3 + i * 2.17, { duration: Number(img.dataset.develop) || 2 });
    if (reduced) tracked.developNow();
    develop?.add(tracked.item);
    frames.push((_t, dt) => tracked.update(dt, viewport.width, viewport.height));
  });

  const cursor = initCursor();
  initNav({ lenis: scroll.lenis });
  initClock(site.location.timeZone, site.location.tzLabel);
  initCopy();
  initMarquee(scroll, reduced);
  initTimer();
  initEasterEggs();

  // Keyboard focus always comes into view. Lenis would otherwise finish whatever
  // smooth scroll it was running and leave the focused element off screen.
  // (The pinned line scrolls its own prints into view.)
  document.addEventListener('focusin', (e) => {
    const el = e.target as HTMLElement | null;
    if (!scroll.lenis || !el || el.closest('[data-line], [data-nav], [data-menu]')) return;
    const r = el.getBoundingClientRect();
    if (r.top < 90 || r.bottom > window.innerHeight - 40) scroll.lenis.scrollTo(el, { offset: -window.innerHeight * 0.35 });
  });

  // "Rewind" links go back to the top through the smooth scroller.
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-rewind]')) {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      scroll.toTop();
    });
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());

  return {
    reduced,
    scroll,
    stage,
    develop,
    cursor,
    viewport,
    onFrame: (fn) => void frames.push(fn),
    onTheme: (fn) => void themeListeners.push(fn),
  };
}
