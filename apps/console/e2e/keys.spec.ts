import { projectPath } from './support/console-page'
import { expect, test } from './support/test'

test('creates a named publishable key and revokes it', async ({ page }) => {
  await page.goto(projectPath('/keys'))
  await expect(page.getByText('Chaves ativas')).toBeVisible()

  await page.getByRole('button', { name: 'Nova chave' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: /Nome/ }).fill('App E2E')
  await dialog.getByRole('button', { name: 'Criar chave' }).click()
  await expect(page.getByText('App E2E')).toBeVisible()

  await page.getByRole('button', { name: /Ações da chave App E2E/ }).click()
  await page.getByRole('menuitem', { name: 'Revogar' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Revogar' }).click()

  await expect(page.getByRole('button', { name: /Revogadas/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Ações da chave App E2E/ })).toHaveCount(0)
})

test('the last secret key cannot be revoked', async ({ page }) => {
  await page.goto(projectPath('/keys'))

  await page
    .getByRole('button', { name: /Ações da chave secreta/ })
    .first()
    .click()

  await expect(page.getByRole('menuitem', { name: 'Revogar' })).toBeDisabled()
  await page.keyboard.press('Escape')
})
