import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests against a running stack: the console (`E2E_CONSOLE_URL`), its API
 * (`E2E_API_URL`), the platform tenant's publishable key (`E2E_PLATFORM_KEY`) and Mailpit
 * (`E2E_MAILPIT_URL`). The global setup creates a fresh account and project on every run, so the
 * tests never depend on data left by earlier runs.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/support/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.E2E_CONSOLE_URL ?? 'http://localhost:5189',
    trace: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        storageState: 'e2e/.auth/session.json',
      },
    },
  ],
})
