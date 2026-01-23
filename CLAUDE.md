# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OKARAF is a personal portfolio website for Omar Karaf, built with React, TypeScript, and Vite. It features a WebGL-based dithered wave background effect using Three.js and postprocessing.

## Commands

- `npm run dev` - Start development server on port 7777
- `npm run build` - TypeScript compile + Vite production build
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Architecture

### Entry Points
The project has two HTML entry points configured in `vite.config.ts`:
- `index.html` - Main portfolio page
- `certificates/index.html` - Certificates subpage

### Tech Stack
- **React 19** with TypeScript for the WebGL component
- **Three.js** via `@react-three/fiber` and `@react-three/postprocessing` for 3D rendering
- **Bootstrap 5** for layout utilities (via SASS in `src/sass/`)
- **GSAP + ScrollTrigger** for scroll animations (loaded via CDN)
- **Lenis** for smooth scrolling
- **Framer Motion** available for React animations

### Key Components
- `src/components/Dither.tsx` - Main React component implementing the animated dithered wave background using custom GLSL shaders. Renders into `#background` div. Features:
  - Custom vertex/fragment shaders for Perlin noise-based wave patterns
  - Postprocessing effect for retro dithering using Bayer matrix
  - Optional mouse interaction support

- `src/js/script.js` - Vanilla JS for music toggle and navbar hide-on-scroll behavior
- `src/js/lenis.js` - Lenis smooth scroll setup integrated with GSAP

### Styling
- `src/css/main.css` - Main styles
- `src/css/BootstrapSASS.css` - Compiled Bootstrap customizations
- `src/sass/BootstrapSASS.scss` - SASS source
- Custom font: Fenice Regular (`src/css/fonts/`)

## Deployment

Deployed on Netlify with redirects configured in `netlify.toml`. Primary domain: okaraf.netlify.app
