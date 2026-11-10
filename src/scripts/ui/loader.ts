/**
 * The darkroom timer replaces the old % loader: it counts 00:00 -> 00:45 as
 * real assets arrive, never faster than `min` ms so the moment registers.
 */
export function runLoader(opts: { tasks: Promise<unknown>[]; min: number; max: number }): Promise<void> {
  const el = document.querySelector<HTMLElement>('[data-loader]');
  if (!el) return Promise.resolve();
  const digits = [...el.querySelectorAll<HTMLElement>('[data-digit]')];
  const bar = el.querySelector<HTMLElement>('[data-loader-bar]');

  let done = 0;
  const total = Math.max(1, opts.tasks.length);
  for (const task of opts.tasks) task.finally(() => done++).catch(() => undefined);

  const start = performance.now();
  let shown = 0;

  return new Promise((resolve) => {
    const tick = () => {
      const elapsed = performance.now() - start;
      const loaded = elapsed > opts.max ? 1 : done / total;
      const target = Math.min(loaded, opts.min > 0 ? elapsed / opts.min : 1);
      shown += (target - shown) * 0.14;
      if (target >= 1 && shown > 0.996) shown = 1;

      const secs = Math.round(shown * 45);
      const text = `00${String(secs).padStart(2, '0')}`;
      digits.forEach((d, i) => (d.textContent = text.charAt(i)));
      if (bar) bar.style.transform = `scaleX(${shown})`;

      if (shown >= 1) resolve();
      else requestAnimationFrame(tick);
    };
    tick();
  });
}
