import { gsap } from 'gsap';
import type { Scroll } from '../motion/scroll';

/** Live local time in Nalchik for every [data-clock]. */
export function initClock(timeZone: string, label: string) {
  const clocks = [...document.querySelectorAll<HTMLElement>('[data-clock]')];
  if (!clocks.length) return;
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const tick = () => {
    const text = `${fmt.format(new Date())} ${label}`;
    for (const c of clocks) c.textContent = text;
  };
  tick();
  window.setInterval(tick, 1000);
}

/** Buttons that copy their data-copy value. */
export function initCopy() {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
    const idle = button.textContent ?? 'Copy';
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy ?? '');
        button.textContent = 'Copied ✓';
      } catch {
        button.textContent = 'Press Ctrl+C';
      }
      window.setTimeout(() => (button.textContent = idle), 1800);
    });
  }
}

/** The film strip in the footer: drifts on its own, runs with the scroll, reverses with it. */
export function initMarquee(scroll: Scroll, reduced: boolean) {
  const track = document.querySelector<HTMLElement>('[data-marquee]');
  if (!track || reduced) return;
  let x = 0;
  let direction = -1;
  let half = 0;
  let visible = false;
  const measure = () => void (half = track.scrollWidth / 2);
  measure();
  window.addEventListener('resize', measure);
  document.fonts.ready.then(measure);
  new IntersectionObserver(([entry]) => void (visible = !!entry?.isIntersecting)).observe(track);
  gsap.ticker.add((_t, deltaMs) => {
    if (!visible || !half) return;
    const dt = Math.min(deltaMs / 1000, 1 / 20);
    const v = scroll.velocity();
    if (Math.abs(v) > 0.4) direction = v > 0 ? -1 : 1;
    const speed = 36 + Math.min(900, Math.abs(v) * 28);
    x += direction * speed * dt;
    if (x <= -half) x += half;
    if (x > 0) x -= half;
    track.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
  });
}

/** Scroll progress as darkroom development time: 00:00 at the top, 06:00 at the bottom. */
export function initTimer() {
  const el = document.querySelector<HTMLElement>('[data-timer]');
  if (!el) return;
  let last = '';
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    const secs = Math.round(p * 360);
    const text = `Dev ${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')} / 06:00`;
    if (text !== last) el.textContent = last = text;
    document.documentElement.classList.toggle('timer-on', window.scrollY > window.innerHeight * 0.7);
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
}

/** For whoever opens the console, and a negative of the whole site on N. */
export function initEasterEggs() {
  console.log(
    '%cOKARAF%c\nYou opened the darkroom door. Good instinct.\nHiring, or have something to build? okaraf07@gmail.com',
    'font: 400 28px Fenice, serif; letter-spacing: .12em; color: #e5321e;',
    'font: 12px "Fragment Mono", monospace; color: inherit; line-height: 1.6;',
  );
  window.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement | null;
    if (e.metaKey || e.ctrlKey || e.altKey || target?.closest('input, textarea, select, [contenteditable]')) return;
    if (e.key === 'n' || e.key === 'N') document.documentElement.classList.toggle('is-negative');
  });
}
