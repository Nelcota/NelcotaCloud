import { fileURLToPath } from 'node:url'

import { type Page, expect } from '@playwright/test'

import { readStack } from './stack'

/** The signed-in browser state the setup project saves and every test starts from. */
export const SESSION_FILE = fileURLToPath(new URL('../.auth/session.json', import.meta.url))

/** The viewer's signed-in state, for the read-only tests. */
export const VIEWER_SESSION_FILE = fileURLToPath(
  new URL('../.auth/session-viewer.json', import.meta.url),
)

/** Signs an account in through the login form, as a person would (the owner by default). */
export async function signIn(
  page: Page,
  account: { email: string; password: string } = readStack(),
): Promise<void> {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(account.email)
  await page.getByLabel('Senha', { exact: true }).fill(account.password)
  await page.getByRole('button', { name: 'Entrar' }).last().click()
  await expect(page).toHaveURL(/\/$/)
}

export function projectPath(path = ''): string {
  return `/projects/${readStack().projectId}${path}`
}

/** The page never scrolls sideways: every row fits the viewport. */
export async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement
    const main = document.getElementById('console-content') ?? root

    return {
      document: root.scrollWidth - root.clientWidth,
      main: main.scrollWidth - main.clientWidth,
    }
  })

  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.main).toBeLessThanOrEqual(1)
}
