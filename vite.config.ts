import { defineConfig, type Plugin } from 'vite'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, sep } from 'node:path'

/** Public address of this build. Used for canonical and social-card URLs. */
const SITE = 'https://okaraf.ru'

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

/**
 * The project sites are whole static builds in public/<name>/. Netlify serves
 * /<name>/ and /<name>/page from their index.html (or page.html); the dev server
 * only knows public/ file by file, so it would answer with the home page instead.
 * Point folder-style addresses at the file Netlify would serve.
 */
function publicSites(): Plugin {
  return {
    name: 'okaraf-public-sites',
    configureServer(server) {
      const pub = resolve(server.config.publicDir)
      server.middlewares.use((req, _res, next) => {
        const [path, query = ''] = (req.url ?? '/').split(/(?=\?)/)
        if (path === '/' || /\.\w+$/.test(path)) return next()
        const candidates = path.endsWith('/') ? [`${path}index.html`] : [`${path}/index.html`, `${path}.html`]
        for (const url of candidates) {
          let file: string
          try {
            file = resolve(pub, `.${decodeURIComponent(url)}`)
          } catch {
            return next()
          }
          if (file.startsWith(pub + sep) && existsSync(file)) {
            req.url = url + query
            break
          }
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [htmlPartials(), publicSites()],
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
