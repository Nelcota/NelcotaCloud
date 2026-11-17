import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Uses the SDK from this repository; an app outside it installs `@nelcota/sdk` instead.
      '@nelcota/sdk': fileURLToPath(new URL('../../packages/sdk/src/index.ts', import.meta.url)),
    },
  },
  // The console uses 5173; this port must match the project's site URL.
  server: { port: 5174, strictPort: true },
})
