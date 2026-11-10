import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getTheme } from '../theme';

gsap.registerPlugin(ScrollTrigger);

/**
 * Contact section: a fluorescent flicker, then the room switches to white
 * light. Scrolling back above the section switches the safelight back on.
 * If the visitor already turned the lights on, there's nothing to flicker.
 */
export function initLights(opts: { reduced: boolean; onChange?: (on: boolean) => void }) {
  const root = document.documentElement;
  const section = document.querySelector<HTMLElement>('[data-contact]');
  const flash = document.querySelector<HTMLElement>('[data-flash]');
  if (!section) return;

  let on = false;
  const set = (value: boolean) => {
    if (on === value) return;
    on = value;
    root.dataset.lights = value ? 'on' : 'off';
    opts.onChange?.(value);
  };

  ScrollTrigger.create({
    trigger: section,
    start: 'top 45%',
    onEnter: () => {
      if (opts.reduced || !flash || getTheme() === 'lights') return set(true);
      gsap
        .timeline()
        .set(flash, { opacity: 0 })
        .to(flash, { opacity: 0.85, duration: 0.04 })
        .add(() => set(true))
        .to(flash, { opacity: 0.08, duration: 0.09 })
        .to(flash, { opacity: 0.6, duration: 0.04 })
        .to(flash, { opacity: 0.15, duration: 0.07 })
        .to(flash, { opacity: 0, duration: 0.7, ease: 'power2.out' });
    },
    onLeaveBack: () => set(false),
  });
}
