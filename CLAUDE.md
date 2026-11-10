# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

OKARAF, the portfolio of Omar Karaf (websites, automations, AI). The concept is a **darkroom**: a *developer* is also the chemical that turns a latent image into a visible one. Things on the page *develop*: the hero name out of the old site's dither noise, project screenshots out of blank paper, the contact section when the lights come on. English only.

## Commands

- `npm run dev` — dev server on http://localhost:7777
- `npm run build` — `astro check` (types + templates) then static build to `dist/`
- `npm run preview` — serve the built site

Astro is pinned to **7.3.x** because 7.4+ requires Node ≥ 22.23.4 (this machine has 22.21). TypeScript is pinned to 6.x for `@astrojs/check`.

## Architecture

- **Astro, static output.** Pages: `src/pages/index.astro`, `work/[slug].astro`, `archive.astro`, `404.astro`. Layout: `src/layouts/Base.astro` (SEO, theme bootstrap, canvas, nav, footer).
- **Content:** projects are a content collection (`src/content.config.ts`, `src/content/work/*.md`). Everything else (contacts, values, credentials, services, steps) is in `src/data/site.ts`.
- **One WebGL canvas** (OGL) sits *behind* the page (`.stage`, z-index 0). DOM content is above it, so anything drawn in WebGL needs a transparent DOM "window" (e.g. print borders are CSS borders, the `<img>` inside is `opacity: 0` when `html.gl`).
  - `src/scripts/stage/Stage.ts`: renderer, ortho camera in CSS px (meshes at `(x, -y)`).
  - `Tray.ts`: the hero. Old wave field → ripple sim (half-float) → composite. Latent text from `latent.ts`.
  - `Develop.ts`: any image that develops (prints, demos, case shots). Owners write screen geometry + progress each frame; `trackImage()` handles plain `img[data-develop]`.
  - Shaders in `stage/shaders/`; `common.glsl` is the noise + Bayer dither ported from the old `Dither.tsx`.
- **Motion:** GSAP (ScrollTrigger, SplitText) + Lenis (`src/scripts/motion/scroll.ts`). One ticker loop in `src/scripts/app.ts`: page frame callbacks, then `stage.render`.
- **Per-page entry scripts:** `src/scripts/pages/{home,case,archive}.ts`, all starting with `boot()` from `app.ts`.
- **Themes:** `html[data-theme="safelight"|"lights"]` (visitor choice, persisted in localStorage) and `html[data-lights="on"]` (contact section moment). WebGL colours for both live in `src/scripts/theme.ts` (`LOOKS`); CSS tokens in `src/styles/tokens.css`.
- **Page transitions:** native cross-document view transitions (`@view-transition` in `global.css`). On the home page, `pageswap` gives the clicked print `view-transition-name: print-cover` so it morphs into the case-study cover.

## Conventions and gotchas

- Placeholders are bracketed (`[Jan 2027]`) and listed in `PLACEHOLDERS.md`. Keep that file current.
- Don't use `data-lights` as a hook on elements: `[data-lights]` matches `<html>`. The contact section uses `data-contact`.
- `compressHTML: true` in `astro.config.mjs` is deliberate: Astro 7's default JSX-style whitespace stripping eats spaces between inline elements.
- YAML in `src/content/work/*.md`: quote list items that contain `: `.
- Everything must work without WebGL (`html.no-gl`) and with `prefers-reduced-motion` (no pinning, no physics, images shown developed).
- GitHub Desktop stashes uncommitted work when switching branches. Work lives on `new-portfolio`.

## Deployment

Netlify (`netlify.toml`): build `npm run build`, publish `dist`, `/certificates` → `/archive/` (301), immutable caching for `/_astro/*` and `/fonts/*`. The contact form uses Netlify Forms (`name="contact"`).
