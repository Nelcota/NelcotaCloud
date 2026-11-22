// Captures every page twice: while the API is slow (the skeleton) and once it answered.
// Usage: node e2e/tools/capture-skeletons.mjs <output folder>
import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { chromium } from '@playwright/test'

const output = process.argv[2] ?? 'test-results/skeletons'
const consoleUrl = process.env.E2E_CONSOLE_URL ?? 'http://localhost:5189'
const apiUrl = process.env.E2E_API_URL ?? 'http://127.0.0.1:8097'
const stack = JSON.parse(readFileSync('e2e/.auth/stack.json', 'utf8'))
const project = `/projects/${stack.projectId}`
const pages = {
  projects: '/',
  overview: project,
  keys: `${project}/keys`,
  activity: `${project}/activity`,
  users: `${project}/users`,
  providers: `${project}/providers`,
  email: `${project}/email`,
  database: `${project}/database`,
  table: `${project}/database/${stack.table}`,
  sql: `${project}/sql`,
  storage: `${project}/storage`,
  webhooks: `${project}/webhooks`,
  team: `${project}/team`,
  settings: `${project}/settings`,
  account: '/account',
}

// `E2E_PAGES=team,webhooks` captures only those.
const only = (process.env.E2E_PAGES ?? '').split(',').filter((name) => name !== '')
const chosen = Object.entries(pages).filter(([name]) => only.length === 0 || only.includes(name))

mkdirSync(output, { recursive: true })
const browser = await chromium.launch()
const context = await browser.newContext({
  storageState: 'e2e/.auth/session.json',
  viewport: { width: 1440, height: 900 },
})
let delay = 0
await context.route(`${apiUrl}/**`, async (route) => {
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay))
  }
  await route.continue()
})
const page = await context.newPage()

for (const [name, path] of chosen) {
  // Every API call waits, as on a slow network: the page shows its skeleton meanwhile.
  delay = 3500
  await page.goto(`${consoleUrl}${path}`)
  await page.waitForTimeout(2500)
  await page.screenshot({ path: join(output, `${name}-1-loading.png`) })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(8000)
  await page.screenshot({ path: join(output, `${name}-2-loaded.png`) })
}

await browser.close()
process.stdout.write(`captured ${chosen.length} pages in ${output}
`)
