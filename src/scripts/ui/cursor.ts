import { gsap } from 'gsap';

export interface Cursor {
  /** Hide the dot (e.g. while the hero's loupe is the cursor). */
  setHidden(hidden: boolean): void;
}

/** A safelight dot that follows the pointer and names what's under it. Fine pointers only. */
export function initCursor(): Cursor | null {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return null;
  const el = document.querySelector<HTMLElement>('[data-cursor-root]');
  const label = el?.querySelector<HTMLElement>('[data-cursor-label]');
  if (!el || !label) return null;
  document.documentElement.classList.add('has-cursor');

  let x = -100;
  let y = -100;
  let tx = -100;
  let ty = -100;
  window.addEventListener(
    'pointermove',
    (e) => {
      tx = e.clientX;
      ty = e.clientY;
      if (x < -50) {
        x = tx;
        y = ty;
      }
    },
    { passive: true },
  );
  document.addEventListener('pointerover', (e) => {
    const target = (e.target as Element | null)?.closest<HTMLElement>('[data-cursor], a, button');
    const text = target?.dataset.cursor ?? '';
    label.textContent = text;
    el.classList.toggle('is-link', !!target);
    el.classList.toggle('has-label', text.length > 0);
  });
  document.documentElement.addEventListener('pointerleave', () => el.classList.add('is-out'));
  document.documentElement.addEventListener('pointerenter', () => el.classList.remove('is-out'));

  gsap.ticker.add(() => {
    x += (tx - x) * 0.28;
    y += (ty - y) * 0.28;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  });

  return { setHidden: (hidden) => el.classList.toggle('is-hidden', hidden) };
}
