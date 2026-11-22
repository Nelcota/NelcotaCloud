import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import Icons from 'unplugin-icons/vite'
import { defineConfig } from 'vitest/config'

import { compileReactIcon } from './icon-compiler.ts'

export default defineConfig({
  plugins: [react(), Icons({ compiler: { compiler: compileReactIcon, extension: 'js' } })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@nelcota/sdk': fileURLToPath(new URL('../../packages/sdk/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    restoreMocks: true,
  },
})
