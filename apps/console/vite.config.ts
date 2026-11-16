import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import Icons from 'unplugin-icons/vite'
import { defineConfig } from 'vite'

import { compileReactIcon } from './icon-compiler.ts'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Solar icons and brand logos, compiled at build time: only the icons the console imports end up in the bundle.
    Icons({ compiler: { compiler: compileReactIcon, extension: 'js' } }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // The SDK is used from source: one type check, no build step between the two packages.
      '@nelcota/sdk': fileURLToPath(new URL('../../packages/sdk/src/index.ts', import.meta.url)),
    },
  },
})
