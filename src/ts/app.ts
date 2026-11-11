/**
 * What every page does on arrival. Each page's own entry (home.ts, certificates.ts,
 * notfound.ts) calls boot() and adds its particulars through the hooks.
 */
import { gsap } from 'gsap'
import { Field } from './lib/field'
import { Plate } from './lib/plate'
import { fillOnHover, initReveals } from './lib/reveal'
import { ScrollTrigger, initScroll, lockScroll } from './lib/scroll'
import { initClock, initCursor, initLinks, initMarquee, initNav, showNav } from './lib/ui'
import { Veil } from './lib/veil'

declare global {
  interface Window {
    __veilFallback?: number
  }
}

export interface Page {
  /** The visitor asked for reduced motion: everything is simply there. */
  calm: boolean
  /** Not the first page of this visit: skip the count. */
  returning: boolean
}

export interface Hooks {
  /** Pictures that should be in hand before the veil lifts. */
  critical?: string[]
  /** Build the page's own pieces. Runs behind the veil. */
  setup?(page: Page): void
  /** Add the page's entrance to the timeline that starts as the veil lifts. */
  enter?(timeline: gsap.core.Timeline, page: Page): void
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

const loadImage = (src: string) =>
  new Promise<void>((resolve) => {
    const img = new Image()
    img.onload = img.onerror = () => resolve()
    img.src = src
  })

/** Every picture on the page that resolves from 1-bit to colour as it is scrolled to. */
function initPlates(calm: boolean) {
  document.querySelectorAll<HTMLElement>('[data-plate]').forEach((el) => {
    if (calm) return
    const plate = new Plate(el)
    gsap.to(plate, {
      progress: 1,
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 84%', end: 'top 30%', scrub: 0.6 },
    })
  })
}

/** The field seen through letters: footer wordmark and page titles. */
function initWindows(calm: boolean) {
  document.querySelectorAll<HTMLCanvasElement>('canvas[data-field="window"]').forEach((canvas, i) => {
    // Denser than the hero's field, so the letters it is seen through stay legible.
    new Field(canvas, { zoom: 0.55, shift: [3.1 + i * 1.7, -1.4], speed: 0.07, gain: 2.35, still: calm })
  })
}

export function boot(hooks: Hooks = {}) {
  const root = document.documentElement
  const page: Page = {
    calm: root.classList.contains('is-calm'),
    returning: root.classList.contains('is-return'),
  }

  window.clearTimeout(window.__veilFallback)

  initScroll(page.calm)

  const veilEl = document.querySelector<HTMLElement>('[data-veil]')
  const veil = veilEl && !page.calm ? new Veil(veilEl) : null
  if (!veil) veilEl?.classList.add('is-done')

  initNav()
  initClock()
  initCursor()
  initMarquee(page.calm)
  initLinks(veil)
  initWindows(page.calm)
  initPlates(page.calm)
  fillOnHover(gsap.utils.toArray<HTMLElement>('.row-link'))
  hooks.setup?.(page)

  // What must be in hand before the page is shown.
  let done = 0
  const needs = [document.fonts.ready, ...(hooks.critical ?? []).map(loadImage)].map((p) =>
    p.then(
      () => void done++,
      () => void done++,
    ),
  )
  const ready = Promise.all(needs)

  const enter = () => {
    ScrollTrigger.refresh()
    const timeline = gsap.timeline()
    timeline.add(showNav, 0.6)
    timeline.add(initReveals, 0.3)
    hooks.enter?.(timeline, page)
  }

  if (!veil) {
    // Reduced motion: no veil and no arrivals. The stylesheet already shows everything.
    showNav()
    ready.then(() => {
      ScrollTrigger.refresh()
      hooks.enter?.(gsap.timeline(), page)
    })
    return
  }

  const remember = () => {
    try {
      sessionStorage.setItem('okaraf:seen', '1')
    } catch {
      /* private mode: the intro simply plays again next time */
    }
  }

  if (page.returning) {
    // Arriving from another page of the site: the veil is already closed, just lift it.
    Promise.race([ready, wait(1500)]).then(() => {
      veil.open(1)
      enter()
    })
    return
  }

  // First arrival: count while the essentials load, then lift.
  lockScroll(true)
  const started = performance.now()
  let shown = 0
  const count = () => {
    const elapsed = performance.now() - started
    const t = Math.min(1, elapsed / 1500)
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    const loaded = 30 + 70 * (done / needs.length)
    // Never hold the page hostage: after five seconds it opens regardless.
    const goal = elapsed > 5000 ? 100 : Math.min(eased * 100, loaded)
    shown += (goal - shown) * 0.22
    veil.setCount(shown)
    if (shown < 99.5) return

    gsap.ticker.remove(count)
    veil.setCount(100)
    remember()
    gsap
      .timeline({ delay: 0.22 })
      .add(veil.hideUi(0.3))
      .add(() => {
        lockScroll(false)
        veil.open(1.3)
        enter()
      })
  }
  gsap.ticker.add(count)
}
