/**
 * How things arrive. Nothing on the site fades or slides in: text and details come through
 * the dither, the same way the pictures resolve.
 *
 *   data-din     one element, dithered in when it scrolls into view
 *   data-lines   a headline, dithered in line by line
 *   data-words   a paragraph that sharpens word by word as it is scrolled through
 */
import { gsap } from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { ScrollTrigger } from './scroll'
import { CELL, LEVELS, ditherTo, setMask, tile, cellDevicePx, dpr } from './dither'

gsap.registerPlugin(SplitText)

/** Wrap every word in a span, keeping the sentence intact for readers and screen readers. */
export function splitWords(el: HTMLElement): HTMLElement[] {
  const words: HTMLElement[] = []
  const text = el.textContent ?? ''
  el.textContent = ''
  // Only break on ordinary spaces: a non-breaking space keeps its two words in one span.
  text
    .trim()
    .split(/[ \n\t]+/)
    .forEach((word, i) => {
      if (i > 0) el.appendChild(document.createTextNode(' '))
      const span = document.createElement('span')
      span.className = 'w'
      span.textContent = word
      el.appendChild(span)
      words.push(span)
    })
  return words
}

/** Start every scroll-triggered arrival on the page. Call once the veil begins to lift. */
export function initReveals() {
  const singles = gsap.utils.toArray<HTMLElement>('[data-din]')
  ScrollTrigger.batch(singles, {
    start: 'top 94%',
    once: true,
    onEnter: (batch) => ditherTo(batch as HTMLElement[], { duration: 0.7, stagger: 0.07 }),
  })

  gsap.utils.toArray<HTMLElement>('[data-lines]').forEach((el) => {
    let shown = false
    const split = SplitText.create(el, {
      type: 'lines',
      linesClass: 'line',
      autoSplit: true,
      onSplit(self) {
        el.style.visibility = 'visible'
        if (!shown) (self.lines as HTMLElement[]).forEach((line) => (line.style.visibility = 'hidden'))
      },
    })
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => {
        shown = true
        ditherTo(split.lines as HTMLElement[], { duration: 1, stagger: 0.14, cell: 3 })
      },
    })
  })
}

/**
 * A paragraph whose words start as a faint dither and turn solid as the reader scrolls
 * through it. The 1-bit way to dim text: fewer dots, not less opacity.
 */
export function scrubWords(el: HTMLElement) {
  const words = splitWords(el)
  el.style.visibility = 'visible'

  const FAINT = 11
  const SPREAD = 7
  const shown = new Int16Array(words.length).fill(-1)

  const render = (progress: number) => {
    const head = progress * (words.length + SPREAD)
    for (let i = 0; i < words.length; i++) {
      const local = Math.min(1, Math.max(0, (head - i) / SPREAD))
      const level = Math.round(FAINT + (LEVELS - FAINT) * local)
      if (shown[i] === level) continue
      shown[i] = level
      setMask(words[i], level, CELL)
    }
  }

  render(0)
  const state = { p: 0 }
  gsap.to(state, {
    p: 1,
    ease: 'none',
    onUpdate: () => render(state.p),
    scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 58%', scrub: 0.5 },
  })
}

/**
 * Rows that fill with paper on hover. The fill arrives through the dither; the text sits
 * above it in difference mode, so each dot flips the letters over it.
 */
export function fillOnHover(rows: HTMLElement[]) {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
  const FILL_CELL = 3
  const size = `${(8 * cellDevicePx(FILL_CELL)) / dpr()}px`
  // With reduced motion the row simply switches.
  const pace = document.documentElement.classList.contains('is-calm') ? 0 : 1

  rows.forEach((row) => {
    const state = { v: 0 }
    let shown = 0
    row.style.setProperty('--fill-size', `${size} ${size}`)

    const apply = () => {
      const level = Math.round(state.v)
      if (level === shown) return
      shown = level
      row.style.setProperty('--fill', level >= LEVELS ? 'none' : tile(level, FILL_CELL))
      row.classList.toggle('is-fill', level > 0)
    }
    const go = (v: number, duration: number) =>
      gsap.to(state, { v, duration: duration * pace, ease: 'power2.out', overwrite: true, onUpdate: apply, onComplete: apply })

    row.addEventListener('pointerenter', () => go(LEVELS, 0.42))
    row.addEventListener('pointerleave', () => go(0, 0.5))
    row.addEventListener('focus', () => go(LEVELS, 0.3))
    row.addEventListener('blur', () => go(0, 0.3))
  })
}
