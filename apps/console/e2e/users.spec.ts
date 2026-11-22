import type { Page } from '@playwright/test'

import { projectPath } from './support/console-page'
import { readStack } from './support/stack'
import { expect, test } from './support/test'

async function openUser(page: Page, email: string): Promise<void> {
  await page.goto(projectPath('/users'))
  await page.getByRole('link', { name: email }).click()
  await expect(page.getByRole('heading', { name: email })).toBeVisible()
}

test('lists the app users and narrows them by email', async ({ page }) => {
  const [ana, bruno] = readStack().users
  await page.goto(projectPath('/users'))

  await expect(page.getByRole('link', { name: ana })).toBeVisible()
  await expect(page.getByRole('link', { name: bruno })).toBeVisible()
  await page.getByRole('searchbox').fill('bruno')

  await expect(page.getByRole('link', { name: ana })).toHaveCount(0)
  await expect(page.getByRole('link', { name: bruno })).toBeVisible()
})

test('saves app metadata without a false conflict', async ({ page }) => {
  await openUser(page, readStack().users[0] ?? '')
  await page.getByRole('tab', { name: 'Metadados' }).click()

  const field = page.getByRole('textbox', { name: 'app_metadata' })
  await field.fill('{"plano": "pro"}')
  await page.getByRole('button', { name: 'Salvar' }).first().click()

  await expect(page.getByText('Salvo', { exact: false }).first()).toBeVisible()
  await expect(page.getByText(/mudaram enquanto você editava/)).toHaveCount(0)
  await expect(field).toHaveValue(/"plano": "pro"/)
})

test('blocks and unblocks a user', async ({ page }) => {
  await openUser(page, readStack().users[1] ?? '')

  await page.getByRole('button', { name: 'Bloquear', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Bloquear', exact: true }).click()
  await expect(page.getByText('Bloqueado', { exact: true }).first()).toBeVisible()

  await page.getByRole('button', { name: 'Desbloquear' }).click()
  await expect(page.getByRole('button', { name: 'Bloquear', exact: true })).toBeVisible()
})
