import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 777
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: 'index.html',
        certificates: 'certificates/index.html'
      },
    },
  },
})
