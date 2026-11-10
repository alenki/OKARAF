// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Astro is pinned to 7.3.x because 7.4+ needs Node >= 22.23.4.
export default defineConfig({
  site: 'https://okaraf.netlify.app',
  integrations: [sitemap()],
  server: { port: 7777 },
  // Astro 7 defaults to JSX-style whitespace stripping, which eats the spaces
  // between inline elements in running text. Keep HTML-aware compression.
  compressHTML: true,
  devToolbar: { enabled: false },
});
