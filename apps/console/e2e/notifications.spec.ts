import { randomBytes } from 'node:crypto'

import { expect, test } from './support/test'

import { projectPath } from './support/console-page'
import { waitForEmail } from './support/stack'

test('adds an email channel and its test alert arrives', async ({ page }) => {
  const recipient = `alertas.${randomBytes(3).toString('hex')}@example.test`
  await page.goto(projectPath('/settings#notificacoes'))

  await page.getByRole('button', { name: 'Adicionar canal' }).click()
  await page.getByRole('dialog').getByRole('textbox', { name: 'Endereço' }).fill(recipient)
  await page.getByRole('dialog').getByRole('button', { name: 'Adicionar canal' }).click()
  await expect(page.getByText(recipient)).toBeVisible()
  await expect(page.getByText('1 de 5 canais')).toBeVisible()

  await page.getByRole('button', { name: 'Testar' }).click()
  await expect(page.getByText('Enviado.')).toBeVisible()
  expect(await waitForEmail(recipient)).toContain('Teste de notificação do projeto')

  await page.getByRole('button', { name: 'Remover canal' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Remover canal' }).click()
  await expect(page.getByText('Nenhum canal')).toBeVisible()
})
