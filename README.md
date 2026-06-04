# OKARAF

Portfolio website for web developer **Omar Karaf** ([okaraf.ru](https://okaraf.ru)).

Built with **React + TypeScript + Vite**. The hero section features an interactive
WebGL "dithered wave" animation rendered with Three.js and custom GLSL shaders.
Deployed on **Netlify**.

## Architecture

A hybrid app: the page is mostly static HTML/CSS/JS, and React renders **only** the
animated hero background (the `#background` element). There is no router and no
global state.

- `index.html` — main portfolio page (loader, music toggle, hero, project grid, footer)
- `certificates/index.html` — standalone certificates page (no React)
- `src/main.tsx` — mounts the `<Dither>` background into `#background`
- `src/components/Dither.tsx` — the WebGL dithered-wave component (the only React component)
- `src/js/script.js` — music toggle + navbar hide-on-scroll
- `src/js/lenis.js` — smooth scrolling via [Lenis](https://github.com/darkroomengineering/lenis)
- `src/css/main.css` — custom styles, fonts, animations
- `src/sass/BootstrapSASS.scss` — Bootstrap customization (compiled to `src/css/BootstrapSASS.css`)

Both HTML pages are configured as separate Vite entry points in `vite.config.ts`.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server on port **7777** |
| `npm run build` | Type-check (`tsc -b`) and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint over the project |

## Deployment

Netlify, configured in `netlify.toml`:

- `/certificates` is served from `certificates/index.html`
- The `okaraf.netlify.app` subdomain is 301-redirected to `okaraf.ru`
- Security headers are applied to all routes; hashed assets are cached immutably
