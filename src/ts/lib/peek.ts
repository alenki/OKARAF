/**
 * The certificate that follows the pointer down the ledger. One plate, re-pointed at
 * whichever row is under the pointer, resolving from 1-bit to colour each time.
 * Pointer devices only; on touch the rows are plain links to the PDFs.
 */
import { gsap } from 'gsap'
import { Plate } from './plate'

export function initPeek(rows: HTMLElement[]) {
  if (!rows.length || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

  const peek = document.createElement('div')
  peek.className = 'peek'
  peek.setAttribute('aria-hidden', 'true')
  peek.innerHTML = '<div class="plate" data-peek-plate><img alt="" decoding="async" /></div>'
  document.body.appendChild(peek)

  const plate = new Plate(peek.firstElementChild as HTMLElement)
  const xTo = gsap.quickTo(peek, 'x', { duration: 0.55, ease: 'power3.out' })
  const yTo = gsap.quickTo(peek, 'y', { duration: 0.55, ease: 'power3.out' })
  let resolve: gsap.core.Tween | null = null

  const place = (e: PointerEvent, jump: boolean) => {
    const box = peek.getBoundingClientRect()
    const gap = 28
    // Sit to the right of the pointer, or to the left when there is no room.
    let x = e.clientX + gap
    if (x + box.width > window.innerWidth - 12) x = e.clientX - gap - box.width
    const y = Math.min(Math.max(12, e.clientY - box.height / 2), window.innerHeight - box.height - 12)
    if (jump) gsap.set(peek, { x, y })
    xTo(x)
    yTo(y)
  }

  rows.forEach((row) => {
    const src = row.dataset.peek
    const width = Number(row.dataset.w)
    const height = Number(row.dataset.h)
    if (!src || !width || !height) return

    row.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return
      resolve?.kill()
      plate.progress = 0
      plate.show(src, width, height)
      peek.classList.add('is-on')
      place(e, true)
      resolve = gsap.to(plate, { progress: 1, duration: 0.8, delay: 0.06, ease: 'power2.inOut' })
    })
    row.addEventListener('pointermove', (e) => place(e, false))
    row.addEventListener('pointerleave', () => {
      resolve?.kill()
      peek.classList.remove('is-on')
    })
  })

  // Have the pictures in the cache before the pointer gets there.
  let warmed = false
  const warm = () => {
    if (warmed) return
    warmed = true
    rows.forEach((row) => {
      if (row.dataset.peek) new Image().src = row.dataset.peek
    })
  }
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        warm()
        io.disconnect()
      }
    },
    { rootMargin: '600px' },
  )
  io.observe(rows[0])
}
