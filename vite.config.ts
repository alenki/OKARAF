import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Hosted under a sub-path on reg.ru: https://lumako.ru/okaraf/
  base: '/okaraf/',
  plugins: [react()],
  server: {
    port: 7777
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        main: 'index.html',
        certificates: 'certificates/index.html'
      },
    },
  },
})
