/**
 * The small machinery around the content: the nav pill, the pointer companion, the clock,
 * the values marquee, in-page anchors and the hand-off between pages.
 */
import { gsap } from 'gsap'
import { onScroll, scrollTo, velocity } from './scroll'
import type { Veil } from './veil'

const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches

/* Nav ------------------------------------------------------------------------ */

/** Hides on the way down, returns on the way up, and underlines the section in view. */
export function initNav() {
  const nav = document.querySelector<HTMLElement>('[data-nav]')
  if (!nav) return

  let last = window.scrollY
  onScroll((y) => {
    if (y > last && y > 100) nav.classList.add('is-hidden')
    else if (y < last) nav.classList.remove('is-hidden')
    last = y
  })

  const links = new Map<Element, HTMLElement>()
  nav.querySelectorAll<HTMLElement>('[data-nav-link]').forEach((link) => {
    const section = document.getElementById(link.dataset.navLink!)
    if (section) links.set(section, link)
  })
  if (!links.size) return

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => links.get(entry.target)?.classList.toggle('is-active', entry.isIntersecting))
    },
    { rootMargin: '-45% 0px -45% 0px' },
  )
  links.forEach((_link, section) => io.observe(section))
}

export const showNav = () => document.querySelector('[data-nav]')?.classList.add('is-in')

/* Pointer companion -------------------------------------------------------------- */

export function initCursor() {
  const el = document.querySelector<HTMLElement>('[data-cursor-el]')
  if (!el || !finePointer()) return
  const label = el.querySelector<HTMLElement>('[data-cursor-label]')!
  // The companion is the only pointer: hide the system one wherever it is active.
  document.documentElement.classList.add('has-cursor')

  // No easing: the companion is the pointer, so it sits exactly where the mouse is.
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`
      el.classList.add('is-on')
    },
    { passive: true },
  )

  document.addEventListener('pointerover', (e) => {
    const target = e.target as Element | null
    const labelled = target?.closest<HTMLElement>('[data-cursor]') ?? null
    const link = target?.closest('a, button') ?? null
    if (labelled) label.textContent = labelled.dataset.cursor ?? ''
    el.classList.toggle('is-label', !!labelled)
    el.classList.toggle('is-plate', !!labelled?.matches('[data-plate]'))
    el.classList.toggle('is-link', !labelled && !!link)
  })

  document.documentElement.addEventListener('pointerleave', () => el.classList.remove('is-on'))
  window.addEventListener('blur', () => el.classList.remove('is-on'))
}

/* Clock --------------------------------------------------------------------------- */

/** Nalchik keeps Moscow time. */
export function initClock() {
  const els = document.querySelectorAll<HTMLElement>('[data-clock]')
  if (!els.length) return
  let format: Intl.DateTimeFormat
  try {
    format = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Europe/Moscow',
    })
  } catch {
    return
  }
  const tick = () => {
    const now = new Date()
    const text = `${format.format(now)} GMT+3`
    els.forEach((el) => {
      if (el.textContent !== text) el.textContent = text
      el.setAttribute('datetime', now.toISOString())
    })
  }
  tick()
  window.setInterval(tick, 15_000)
}

/* Values marquee -------------------------------------------------------------------- */

/** Drifts on its own, leans into the scroll, and turns around when the reader does. */
export function initMarquee(calm: boolean) {
  document.querySelectorAll<HTMLElement>('[data-marquee]').forEach((root) => {
    const track = root.querySelector<HTMLElement>('[data-marquee-track]')
    const set = root.querySelector<HTMLElement>('[data-marquee-set]')
    if (!track || !set) return

    const copy = set.cloneNode(true) as HTMLElement
    copy.setAttribute('aria-hidden', 'true')
    copy.removeAttribute('data-marquee-set')
    track.appendChild(copy)
    if (calm) return

    let width = set.offsetWidth
    let x = 0
    let direction = 1
    let push = 0
    let visible = false

    new ResizeObserver(() => (width = set.offsetWidth)).observe(set)
    new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), { rootMargin: '120px' }).observe(root)

    gsap.ticker.add((_time, delta) => {
      if (!visible || !width) return
      const v = velocity()
      if (Math.abs(v) > 0.4) direction = v > 0 ? 1 : -1
      push += (Math.abs(v) * 0.85 - push) * 0.1
      const drift = (window.innerWidth * 0.062 * Math.min(delta, 50)) / 1000
      x -= direction * (drift + push)
      x = (((x % width) + width) % width) - width
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`
    })
  })
}

/* Links ----------------------------------------------------------------------------- */

const samePath = (a: string, b: string) => a.replace(/\/(index\.html)?$/, '') === b.replace(/\/(index\.html)?$/, '')

/**
 * In-page anchors scroll smoothly; links to another page of the site first let the veil
 * close. Everything else (new tabs, PDFs, other sites) is left to the browser.
 */
export function initLinks(veil: Veil | null) {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const a = (e.target as Element | null)?.closest('a')
    if (!a || !a.href || a.target === '_blank' || a.hasAttribute('download')) return

    const url = new URL(a.href, window.location.href)
    if (url.origin !== window.location.origin) return

    if (samePath(url.pathname, window.location.pathname) && url.search === window.location.search) {
      if (!url.hash) return
      const id = decodeURIComponent(url.hash.slice(1))
      const target = id === 'top' ? null : document.getElementById(id)
      if (id !== 'top' && !target) return
      e.preventDefault()
      scrollTo(target ?? 0)
      window.history.replaceState(null, '', target ? url.hash : window.location.pathname)
      if (target) {
        // Hand keyboard and screen-reader focus to the section as well.
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
        target.focus({ preventScroll: true })
      }
      return
    }

    if (!veil || /\.(pdf|png|jpe?g|webp|avif|svg|zip)$/i.test(url.pathname)) return
    e.preventDefault()
    veil.close().then(() => window.location.assign(url.href))
  })

  // Coming back through the browser's history restores the page as it was left: open.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) veil?.reset()
  })
}
