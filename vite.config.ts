import { defineConfig, type Plugin } from 'vite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Public address of this build. Used for canonical and social-card URLs. */
const SITE = 'https://okaraf.netlify.app'

const PARTIALS = resolve(import.meta.dirname, 'src/partials')

/**
 * Tiny HTML include, so the three pages share one nav, footer and <head>.
 *
 *   <!-- @include nav.html home="" current="home" -->
 *
 * Inside a partial, {{name}} is replaced by the attribute of the same name
 * (or by nothing when it was not passed). {{site}} is always available.
 */
function htmlPartials(): Plugin {
  // Values may be double- or single-quoted, so a value can itself carry an HTML attribute:
  //   <!-- @include nav.html certificates='aria-current="page"' -->
  const INCLUDE = /<!--\s*@include\s+([\w./-]+)((?:\s+[\w-]+=(?:"[^"]*"|'[^']*'))*)\s*-->/g
  const ATTR = /([\w-]+)=(?:"([^"]*)"|'([^']*)')/g

  const render = (html: string, depth = 0): string =>
    html.replace(INCLUDE, (_all, file: string, rawAttrs: string) => {
      if (depth > 4) throw new Error(`@include nested too deeply at ${file}`)
      const vars: Record<string, string> = { site: SITE }
      for (const m of rawAttrs.matchAll(ATTR)) vars[m[1]] = m[2] ?? m[3]
      const body = readFileSync(resolve(PARTIALS, file), 'utf8')
      return render(
        body.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (_m, key: string) => vars[key] ?? ''),
        depth + 1,
      )
    })

  return {
    name: 'okaraf-html-partials',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => render(html).replace(/\{\{\s*site\s*\}\}/g, SITE),
    },
    handleHotUpdate({ file, server }) {
      if (file.replace(/\\/g, '/').includes('/src/partials/')) {
        server.ws.send({ type: 'full-reload' })
        return []
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [htmlPartials()],
  server: {
    port: 7777,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        certificates: 'certificates/index.html',
        notfound: '404.html',
      },
    },
  },
})
