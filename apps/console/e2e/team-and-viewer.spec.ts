import { randomBytes } from 'node:crypto'

import { VIEWER_SESSION_FILE, projectPath } from './support/console-page'
import { readStack } from './support/stack'
import { expect, test } from './support/test'

test('the team lists the viewer with its role and the roles table', async ({ page }) => {
  await page.goto(projectPath('/team'))

  const viewerRow = page.getByRole('row', { name: new RegExp(readStack().viewer.email) })
  await expect(viewerRow.getByText('Leitura')).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Leitura' })).toBeVisible()
})

test('invites someone and cancels the invitation', async ({ page }) => {
  const email = `convite.${randomBytes(3).toString('hex')}@example.test`
  await page.goto(projectPath('/team'))

  await page.getByRole('button', { name: 'Convidar' }).click()
  await page.getByRole('dialog').getByRole('textbox', { name: /Email/ }).fill(email)
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Convidar|Enviar convite/ })
    .click()
  await expect(page.getByText(email, { exact: true })).toBeVisible()

  await page.getByRole('button', { name: `Cancelar convite para ${email}` }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar convite' }).click()
  await expect(page.getByText(email, { exact: true })).toHaveCount(0)
})

test.describe('as a viewer', () => {
  test.use({ storageState: VIEWER_SESSION_FILE })

  test('sees the read-only notice and cannot save settings', async ({ page }) => {
    await page.goto(projectPath('/settings'))
    await expect(page.getByText('Você tem acesso só de leitura neste projeto.')).toBeVisible()

    const name = page.getByRole('textbox', { name: /Nome do projeto/ })
    await name.fill(`${readStack().projectName} editado`)
    await page.getByRole('button', { name: 'Salvar' }).first().click()

    await expect(page.getByText(/acesso só de leitura neste projeto\. Peça/)).toBeVisible()
  })

  test('reads the database without the editing controls failing silently', async ({ page }) => {
    await page.goto(projectPath(`/database/${readStack().table}`))

    await expect(page.getByRole('table', { name: /Linhas de/ })).toBeVisible()
    await expect(page.getByText('Caneca')).toBeVisible()
  })
})
