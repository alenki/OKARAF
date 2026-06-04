import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

// Initialize a new Lenis instance for smooth scrolling
const lenis = new Lenis();

// Drive Lenis with a native requestAnimationFrame loop.
// (requestAnimationFrame already passes a millisecond timestamp.)
function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

requestAnimationFrame(raf);
