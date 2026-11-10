import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { boot } from '../app';
import { TRAY_SHADERS, Tray } from '../stage/Tray';
import { DEVELOP_SHADER } from '../stage/Develop';
import { createLine } from '../home/line';
import { initForm, initManifesto, initProcess, initServices } from '../home/sections';
import { initLights } from '../ui/lights';
import { runLoader } from '../ui/loader';
import { LOOKS, getTheme } from '../theme';

gsap.registerPlugin(ScrollTrigger);

/** Give the browser a turn between start-up steps, so no single task blocks input for long. */
const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const fonts = Promise.all([document.fonts.load('400 100px Fenice'), document.fonts.load('400 12px "Fragment Mono"')]).catch(
  () => undefined,
);

async function main() {
  const app = boot();
  const { reduced, stage } = app;

  // The loader starts counting straight away; the rest is set up while it runs.
  const loader = document.querySelector<HTMLElement>('[data-loader]');
  let seen = false;
  try {
    seen = sessionStorage.getItem('okaraf-seen') === '1';
    sessionStorage.setItem('okaraf-seen', '1');
  } catch {
    /* storage blocked: show the loader every time */
  }
  const showLoader = !!loader && !seen && !reduced;
  let printsReady: () => void = () => undefined;
  const prints = new Promise<void>((resolve) => (printsReady = resolve));
  const loaded = showLoader ? runLoader({ tasks: [fonts, prints], min: 1100, max: 4000 }) : fonts;

  // ---------- hero: the sheet in the tray ----------
  await nextTask();
  const hero = document.querySelector<HTMLElement>('[data-hero]')!;
  const sheet = document.querySelector<HTMLElement>('[data-sheet]')!;
  let tray: Tray | null = null;
  if (stage) {
    await stage.prewarm([...TRAY_SHADERS, DEVELOP_SHADER]);
    tray = new Tray(stage, {
      hero,
      sheet,
      look: LOOKS[getTheme()].tray,
      subtitle: 'WEBSITES  ·  AUTOMATIONS  ·  AI',
      corners: ['PRINT No. 001', 'OKARAF  ©  2026', '43.49° N   43.61° E', 'DEV 1+9  ·  20 °C  ·  1:30'],
    });
    stage.add(tray);
    requestAnimationFrame(() => document.documentElement.classList.add('gl-ready'));
    fonts.then(() => tray?.layout());
    app.onTheme((theme) => tray?.setLook(LOOKS[theme].tray));
  }

  // ---------- the line ----------
  await nextTask();
  const line = createLine({ reduced, scroll: app.scroll });
  if (line) {
    for (const item of line.items) app.develop?.add(item);
    app.onFrame(line.update);
    Promise.all(line.items.map((m) => m.img.decode().catch(() => undefined))).then(printsReady);
  } else {
    printsReady();
  }

  // ---------- the rest of the page ----------
  await nextTask();
  initManifesto(app);
  initServices(app);
  await nextTask();
  initProcess(app);
  initLights({ reduced });
  initForm();

  // ---------- intro: the loader once per visit, the develop every time ----------
  const intro = () => {
    const tl = gsap.timeline();
    if (tray && !reduced) {
      tray.state.progress = 0;
      tl.set(tray.state, { glow: 0 }, 0)
        .to(tray.state, { glow: 0.75, duration: 0.05 }, 0.05)
        .to(tray.state, { glow: 0.1, duration: 0.08 }, 0.12)
        .to(tray.state, { glow: 1, duration: 1.4, ease: 'power2.out' }, 0.24)
        .add(() => tray?.splash(0.5, 0.42, 1.2), 0.2)
        .to(tray.state, { progress: 1, duration: 2.9, ease: 'power1.inOut' }, 0.4);
    } else if (tray) {
      tray.state.progress = 1;
      tray.state.glow = 1;
    }
    tl.fromTo(
      '[data-intro]',
      { autoAlpha: 0, y: reduced ? 0 : 22 },
      { autoAlpha: 1, y: 0, duration: reduced ? 0.2 : 1.1, ease: 'expo.out', stagger: reduced ? 0 : 0.08 },
      reduced ? 0 : 1.7,
    );
    tl.fromTo('[data-intro-late]', { autoAlpha: 0 }, { autoAlpha: 1, duration: reduced ? 0.2 : 0.8, stagger: 0.06 }, reduced ? 0 : 2.5);
    document.documentElement.classList.add('is-ready');
  };

  await loaded;
  if (showLoader && loader) {
    gsap.to(loader, { autoAlpha: 0, duration: 0.7, ease: 'power2.inOut', onComplete: () => loader.remove() });
  } else {
    loader?.remove();
  }
  intro();
  requestAnimationFrame(() => ScrollTrigger.refresh());
}

main();

// ---------- page transition: the clicked print becomes the case study's cover ----------

window.addEventListener('pageswap', (event) => {
  const e = event as Event & { viewTransition?: unknown; activation?: { entry?: { url?: string } } };
  const url = e.activation?.entry?.url;
  if (!e.viewTransition || !url) return;
  const link = [...document.querySelectorAll<HTMLAnchorElement>('a[data-print-link]')].find((a) => a.href === url);
  const img = link?.querySelector<HTMLImageElement>('img');
  if (!img) return;
  img.style.opacity = '1';
  img.style.viewTransitionName = 'print-cover';
});
