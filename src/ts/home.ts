/** The home page: the name over the field, then the sheet with the work on it. */
import { gsap } from 'gsap'
import { boot } from './app'
import { ditherTo } from './lib/dither'
import { Field } from './lib/field'
import { initPeek } from './lib/peek'
import { fillOnHover, scrubWords, splitWords } from './lib/reveal'
import { ScrollTrigger } from './lib/scroll'

const hero = document.querySelector<HTMLElement>('.hero')!
const sheet = document.querySelector<HTMLElement>('.sheet')!

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
