import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const apiTarget = 'http://127.0.0.1:8000'

export default defineConfig(({ command }) => ({
  // The build is served by Laravel from backend/public/app; the dev server keeps root URLs.
  base: command === 'build' ? '/app/' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: fileURLToPath(new URL('./backend/public/app', import.meta.url)),
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': { target: apiTarget },
      '/sanctum': { target: apiTarget },
    },
  },
}))
