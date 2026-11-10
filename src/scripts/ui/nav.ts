import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type Lenis from 'lenis';
import { getTheme, setTheme, type Theme } from '../theme';

gsap.registerPlugin(ScrollTrigger);

/**
 * The floating pill: hides on scroll down and returns on scroll up (as the old
 * site did), names the darkroom stage you're in, switches the lights, and on
 * small screens opens a full-screen menu.
 */
export function initNav(opts: { lenis: Lenis | null }) {
  const root = document.documentElement;
  const nav = document.querySelector<HTMLElement>('[data-nav]');
  if (!nav) return;

  // Hide on the way down, show on the way up.
  let lastY = window.scrollY;
  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY;
      if (root.classList.contains('menu-open')) return;
      if (y > lastY && y > 120) nav.classList.add('is-hidden');
      else if (y < lastY) nav.classList.remove('is-hidden');
      lastY = y;
    },
    { passive: true },
  );
  nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));

  // Stage label: each section names itself with data-stage-name.
  const label = nav.querySelector<HTMLElement>('[data-stage-label]');
  const fallback = label?.textContent ?? '';
  const sections = [...document.querySelectorAll<HTMLElement>('[data-stage-name]')];
  const setLabel = (text: string) => {
    if (label && label.textContent !== text) label.textContent = text;
  };
  for (const section of sections) {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (self) => {
        if (self.isActive) setLabel(section.dataset.stageName ?? fallback);
      },
    });
  }

  // Lights: the visitor's theme, remembered.
  const toggle = nav.querySelector<HTMLButtonElement>('[data-theme-toggle]');
  const toggleLabel = nav.querySelector<HTMLElement>('[data-theme-label]');
  const reflect = (theme: Theme) => {
    const lit = theme === 'lights';
    toggle?.setAttribute('aria-pressed', String(lit));
    toggle?.setAttribute('aria-label', lit ? 'Lights: switch to the safelight (dark theme)' : 'Safelight: turn the lights on (light theme)');
    if (toggleLabel) toggleLabel.textContent = lit ? 'Lights' : 'Safelight';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', lit ? '#efeae1' : '#0d0c0b');
  };
  reflect(getTheme());
  toggle?.addEventListener('click', () => {
    const next: Theme = getTheme() === 'lights' ? 'safelight' : 'lights';
    setTheme(next);
    reflect(next);
  });

  // Small screens: full-screen menu.
  const menuToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  if (!menuToggle || !menu) return;
  const links = [...menu.querySelectorAll<HTMLAnchorElement>('a')];
  const open = () => {
    menu.hidden = false;
    root.classList.add('menu-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.textContent = 'Close';
    opts.lenis?.stop();
    gsap.fromTo(menu, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' });
    gsap.fromTo(links, { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.7, ease: 'expo.out', stagger: 0.05 });
    links[0]?.focus();
  };
  const close = (returnFocus = true) => {
    root.classList.remove('menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.textContent = 'Menu';
    opts.lenis?.start();
    gsap.to(menu, { autoAlpha: 0, duration: 0.25, onComplete: () => void (menu.hidden = true) });
    if (returnFocus) menuToggle.focus();
  };
  menuToggle.addEventListener('click', () => (root.classList.contains('menu-open') ? close() : open()));
  for (const link of links) link.addEventListener('click', () => close(false));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('menu-open')) close();
  });
}
