import { defineConfig } from 'tsdown'

const verificationPackages = ['jose', 'standardwebhooks', '@stablelib/base64', 'fast-sha256']

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  dts: true,
  clean: true,
  deps: { alwaysBundle: verificationPackages, onlyBundle: verificationPackages },
})
