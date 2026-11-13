/** The home page: the name over the field, then the sheet with the work on it. */
import { gsap } from 'gsap'
import { boot } from './app'
import { ditherTo } from './lib/dither'
import { Edge } from './lib/edge'
import { Field } from './lib/field'
import { initPeek } from './lib/peek'
import { fillOnHover, scrubWords, splitWords } from './lib/reveal'
import { ScrollTrigger } from './lib/scroll'

const hero = document.querySelector<HTMLElement>('.hero')!
const sheet = document.querySelector<HTMLElement>('.sheet')!

/**
 * The hero is one screen tall (100svh), with the name centred in it. Safari on iOS 26 counts
 * the whole screen into svh, status bar and floating toolbar included (852px on a phone whose
 * page area above the toolbar is 695px), so the hero ran past what can be seen and the name
 * sat low. Where the visible height (innerHeight) is shorter, the hero takes that instead.
 * Safari settles that height only after the page has started loading, so the hero is fitted
 * again whenever the viewport changes while the page rests at the top. Once it has been
 * scrolled, the toolbar coming and going is left alone, as it is with svh, or the sheet would
 * jump; turning the phone (a new width) always refits.
 */
function fitHero() {
  const was = hero.style.height
  hero.style.removeProperty('height')
  const vv = window.visualViewport
  const seen = Math.min(window.innerHeight, vv ? vv.height * vv.scale : Infinity)
  if (hero.offsetHeight - seen > 1) hero.style.height = `${Math.round(seen)}px`
  return hero.style.height !== was
}
fitHero()
let fittedWidth = window.innerWidth
const refitHero = () => {
  const turned = window.innerWidth !== fittedWidth
  if (!turned && window.scrollY > 0) return
  fittedWidth = window.innerWidth
  // ScrollTrigger lets a height-only resize pass on phones, so it is told the page has moved.
  if (fitHero()) ScrollTrigger.refresh()
}
window.addEventListener('resize', refitHero)
window.visualViewport?.addEventListener('resize', refitHero)

/** The field's density is the product of two things: its arrival, and how far the sheet has risen. */
const density = { arrival: 0, scroll: 1 }
let field: Field | null = null
const applyDensity = () => {
  if (field) field.gain = density.arrival * density.scroll
}

boot({
  critical: ['/harmony.webp'],

  setup({ calm }) {
    density.arrival = calm ? 1 : 0
    field = new Field(hero.querySelector<HTMLCanvasElement>('canvas[data-field="hero"]')!, {
      pointer: !calm,
      still: calm,
      gain: density.arrival,
    })
    // The sheet's leading edge, on the same cells as the field.
    new Edge(hero.querySelector<HTMLCanvasElement>('canvas[data-edge]')!, sheet)

    if (!calm) {
      // The field thins out as the sheet climbs over it…
      gsap.to(density, {
        scroll: 0.3,
        ease: 'none',
        onUpdate: applyDensity,
        scrollTrigger: { trigger: sheet, start: 'top bottom', end: 'top top', scrub: true },
      })
      // …and stops drawing altogether once it is covered.
      ScrollTrigger.create({
        trigger: sheet,
        start: 'top top',
        onEnter: () => {
          hero.classList.add('is-covered')
          field?.enable(false)
        },
        onLeaveBack: () => {
          hero.classList.remove('is-covered')
          field?.enable(true)
        },
      })

      const statement = document.querySelector<HTMLElement>('[data-words]')
      if (statement) scrubWords(statement)

      // Project titles arrive word by word.
      gsap.utils.toArray<HTMLElement>('[data-title]').forEach((title) => {
        const words = splitWords(title)
        words.forEach((word) => (word.style.visibility = 'hidden'))
        ScrollTrigger.create({
          trigger: title,
          start: 'top 92%',
          once: true,
          onEnter: () => ditherTo(words, { duration: 0.95, stagger: 0.11, cell: 3 }),
        })
      })

      // The big figure in the record.
      const figures = gsap.utils.toArray<HTMLElement>('[data-figure] > *')
      if (figures.length) {
        figures.forEach((el) => (el.style.visibility = 'hidden'))
        ScrollTrigger.create({
          trigger: figures[0].parentElement,
          start: 'top 85%',
          once: true,
          onEnter: () => ditherTo(figures, { duration: 1.1, stagger: 0.14, cell: 4 }),
        })
      }
    }

    const rows = gsap.utils.toArray<HTMLElement>('.ledger__row')
    fillOnHover(rows)
    if (!calm) initPeek(rows)
  },

  enter(timeline, { calm }) {
    if (calm) return
    const letters = gsap.utils.toArray<HTMLElement>('.hero__name .ch')
    const meta = gsap.utils.toArray<HTMLElement>('[data-hero-meta]')

    timeline.to(density, { arrival: 1, duration: 2.4, ease: 'power2.out', onUpdate: applyDensity }, 0)
    timeline.add(ditherTo(letters, { duration: 1.15, stagger: 0.08, cell: 4 }), 0.3)
    timeline.add(ditherTo(meta, { duration: 0.7, stagger: 0.12 }), 1.25)
  },
})
