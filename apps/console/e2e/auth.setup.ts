import { test as setup } from '@playwright/test'

import { SESSION_FILE, VIEWER_SESSION_FILE, signIn } from './support/console-page'
import { readStack } from './support/stack'

/**
 * Signs in once per account and keeps the sessions for every test: signing in per test would
 * trip the API's login rate limit, which is working as intended.
 */
setup('sign in as the owner', async ({ page }) => {
  await signIn(page)
  await page.context().storageState({ path: SESSION_FILE })
})

setup('sign in as the viewer', async ({ page }) => {
  await signIn(page, readStack().viewer)
  await page.context().storageState({ path: VIEWER_SESSION_FILE })
})
