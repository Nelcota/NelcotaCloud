import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // The SDK is used from source: one type check, no build step between the two packages.
      '@nelcota/sdk': fileURLToPath(new URL('../../packages/sdk/src/index.ts', import.meta.url)),
    },
  },
})
