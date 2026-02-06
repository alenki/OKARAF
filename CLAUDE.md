# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OKARAF is a portfolio website for web developer Omar Karaf (okaraf.ru), built with React + TypeScript + Vite. The hero section features an interactive WebGL dithered wave animation using Three.js with custom GLSL shaders. Deployed on Netlify.

## Commands

- `npm run dev` — Start dev server on port 7777
- `npm run build` — TypeScript check + Vite production build
- `npm run lint` — ESLint across the project
- `npm run preview` — Preview production build locally

## Architecture

**Hybrid app**: The main site is a React+Three.js app mounted into a mostly static HTML page. Only the hero background (`#background` div) is React-rendered; the rest of `index.html` (nav, project grid, contacts) is plain HTML/CSS/JS.

**Dual entry points** (configured in `vite.config.ts`):
- `index.html` — Main portfolio page
- `certificates/index.html` — Certificates showcase (standalone HTML, no React)

**React scope is narrow**: `src/main.tsx` mounts a single `<Dither>` component into the `#background` element. There is no router, no global state management, no API calls.

### Key component: `src/components/Dither.tsx`

This is the only React component. It contains:
- Two inline GLSL shaders (vertex + fragment) for animated noise-based waves
- A dithering post-processing effect using an 8x8 Bayer matrix
- Mouse interaction that distorts the wave field via shader uniforms
- Uses `@react-three/fiber` Canvas, `useFrame` for the animation loop, and `@react-three/postprocessing` EffectComposer

### Non-React code

- `src/js/script.js` — Loading screen, music toggle (mute/unmute), navbar hide-on-scroll
- `src/js/lenis.js` — Smooth scrolling via Lenis library
- `src/css/main.css` — Animations (loading counter), custom Fenice font, layout
- `src/sass/BootstrapSASS.scss` — Bootstrap customization (compiled to `src/css/BootstrapSASS.css`)

### Deployment

Netlify with redirects in `netlify.toml`:
- `/certificates` → `/certificates/index.html`
- Domain redirect from `okaraf.netlify.app` → `okaraf.ru`
- SPA fallback `/*` → `/index.html`
