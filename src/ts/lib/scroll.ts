/**
 * Scrolling: Lenis for the easing, GSAP's ScrollTrigger for everything tied to position.
 * With reduced motion (or without a fine pointer's wheel to smooth) the page scrolls natively
 * and every helper here still works.
 */
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

let lenis: Lenis | null = null

export function initScroll(calm: boolean) {
  if (calm) return
  lenis = new Lenis({ lerp: 0.115, wheelMultiplier: 1 })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis!.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
}

/** Pixels per frame, signed. Zero when scrolling natively. */
export const velocity = () => lenis?.velocity ?? 0

export function lockScroll(locked: boolean) {
  document.documentElement.classList.toggle('is-locked', locked)
  if (locked) lenis?.stop()
  else lenis?.start()
}

export function scrollTo(target: HTMLElement | number, immediate = false) {
  if (lenis) {
    lenis.scrollTo(target, { immediate, duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) })
    return
  }
  const top = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY
  const calm = document.documentElement.classList.contains('is-calm')
  window.scrollTo({ top, behavior: immediate || calm ? 'auto' : 'smooth' })
}

/** Run a callback on every scroll, native or smoothed. */
export function onScroll(fn: (y: number) => void) {
  if (lenis) lenis.on('scroll', () => fn(window.scrollY))
  else window.addEventListener('scroll', () => fn(window.scrollY), { passive: true })
}

export { ScrollTrigger }
