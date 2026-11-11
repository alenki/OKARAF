# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OKARAF is the personal portfolio of Omar Karaf: a static, multi-page site built with Vite and TypeScript (no framework). English only on this branch.

The design rule: **two inks, one material.** The page is ink (`--ink`) and paper (`--paper`), everything textured is an 8×8 ordered (Bayer) dither, and the only colour is the work itself. Project screenshots sit on the page as 1-bit plates and resolve into colour as they are scrolled to. Nothing fades in: text, hover fills, the loader and page transitions all arrive through the same dither.

## Commands

- `npm run dev` - Start development server on port 7777
- `npm run build` - TypeScript check + Vite production build to `dist/`
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Architecture

### Pages

Three HTML entry points, listed in `vite.config.ts`:

- `index.html` - home: hero, about, projects, certificate ledger
- `certificates/index.html` - the six certificates as plates, each linking to its PDF
- `404.html` - served by Netlify for any unknown path

Shared markup lives in `src/partials/` and is pulled in with `<!-- @include name.html key="value" -->`, a small plugin defined in `vite.config.ts`. Inside a partial, `{{key}}` is replaced by the attribute of that name; `{{site}}` is the public URL (the `SITE` constant in `vite.config.ts`, also used for canonical and social-card URLs).

### Tech Stack

- **Vite + TypeScript**, no framework
- **GSAP** (ScrollTrigger, SplitText) for scroll-linked and timed animation
- **Lenis** for smooth scrolling
- **WebGL** (hand-written, no library) for the dithered field
- Fonts are self-hosted: Fenice (display, `src/fonts/`) and Fragment Mono (labels, via `@fontsource`)

### Scripts (`src/ts/`)

- `app.ts` - `boot()`: what every page does on arrival (veil, scrolling, nav, cursor, marquee, plates, reveals). Page entries `home.ts`, `certificates.ts`, `notfound.ts` call it and add their own pieces through `setup` / `enter` hooks.
- `lib/dither.ts` - the Bayer matrix and what the DOM needs from it: mask tiles (`ditherTo`, `setMask`).
- `lib/field.ts` - the WebGL field behind the name (also seen through the footer wordmark and page titles). One fragment per dither cell, scaled up with `image-rendering: pixelated`; draws only while on screen.
- `lib/edge.ts` - the sheet's leading edge over the hero: a 2D canvas inside `.hero`, on the field's own cells. The dots never move; the gradient's coverage follows the sheet as it is scrolled.
- `lib/plate.ts` - a picture as a 1-bit copy that resolves to colour (`plate.progress`, 0 to 1).
- `lib/veil.ts` - the ink sheet used as loader and as the transition between pages.
- `lib/reveal.ts` - arrivals: `data-din` (one element), `data-lines` (headline by line), `data-words` (paragraph that sharpens as it is scrolled), plus the dithered hover fill for rows.
- `lib/scroll.ts`, `lib/ui.ts`, `lib/peek.ts` - Lenis/ScrollTrigger, nav/cursor/clock/marquee/links, and the certificate preview that follows the pointer.

### Styling

One stylesheet, `src/styles/main.css`, ordered by section with tokens at the top. Colours are read from the CSS tokens by the scripts (`token('--ink')`), so the palette is changed in one place.

## Conventions and gotchas

- **Dither cells must sit on whole device pixels.** Every canvas is sized through `cellDevicePx()` in `dither.ts`; do not put fractional transforms (parallax, scale) on a dithered canvas or the pattern turns to moiré.
- **One dither never slides across another.** Two dithered layers whose grids move against each other beat: the picture changes with every pixel of scroll and the overlap strobes. Keep the dots on the fixed grid and move the coverage instead, as `edge.ts`, `veil.ts` and `plate.ts` do. `edge.ts` sizes its canvas with the same arithmetic as `field.ts` so the two share every cell; change one and change the other.
- **Fitted display type.** The hero name and the "window" wordmarks are sized with a `--fit` constant: the word's width in em, measured from the font. If the text, the font or the tracking changes, the constant must be recalculated.
- **Three states to keep working:** `html.js` (normal), `html.is-calm` (prefers-reduced-motion: no veil, no arrivals, plates shown in colour) and no JavaScript at all (everything visible, no field). Anything hidden for an arrival must be hidden only under `.js:not(.is-calm):not(.is-stuck)`.
- Content is factual: project descriptions, certificate dates and results come from the screenshots and certificates in `public/`. Do not add placeholder or invented copy.
- `.playwright-mcp/` and `.superpowers/` are tool output, not part of the site.

## Deployment

Deployed on Netlify (`netlify.toml`): unknown paths get `404.html` with a 404 status, and `/assets/*` is cached immutably. Primary domain: okaraf.netlify.app
