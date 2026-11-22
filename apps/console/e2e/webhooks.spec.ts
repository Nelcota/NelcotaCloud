import { projectPath } from './support/console-page'
import { expect, test } from './support/test'

test('adds the first endpoint, shows its secret once and deletes it', async ({ page }) => {
  await page.goto(projectPath('/webhooks'))
  await expect(page.getByText('Primeiro endpoint')).toBeVisible()

  await page.getByRole('textbox', { name: /URL do seu servidor/ }).fill('127.0.0.1:9/e2e-hook')
  await page.getByRole('button', { name: 'Criar endpoint' }).click()

  await expect(page.getByText(/^whsec_/)).toBeVisible()
  await expect(page.getByRole('link', { name: /127\.0\.0\.1:9/ })).toBeVisible()
  // Leaving with the secret still on screen asks first; confirm it was stored.
  await page.getByRole('button', { name: 'Já guardei o segredo' }).click()
  await expect(page.getByText(/^whsec_/)).toHaveCount(0)

  await page
    .getByRole('link', { name: /127\.0\.0\.1:9/ })
    .first()
    .click()
  await page.getByRole('tab', { name: 'Configurações' }).click()
  await page.getByRole('button', { name: 'Excluir endpoint' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Excluir endpoint' }).click()

  await expect(page).toHaveURL(/\/webhooks$/)
  await expect(page.getByText('Primeiro endpoint')).toBeVisible()
})
