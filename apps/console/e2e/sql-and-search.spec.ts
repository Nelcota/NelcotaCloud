import { projectPath } from './support/console-page'
import { expect, test } from './support/test'

test('runs a query in the SQL editor and shows the result', async ({ page }) => {
  await page.goto(projectPath('/sql'))

  const editor = page.locator('textarea').first()
  await editor.fill('select count(*) as total_itens from e2e_itens;')
  await page.getByRole('button', { name: /Executar/ }).click()

  await expect(page.getByText('total_itens', { exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: /^\d+$/ }).first()).toBeVisible()
})

test('shows the Postgres error of a broken query', async ({ page }) => {
  await page.goto(projectPath('/sql'))

  await page.locator('textarea').first().fill('select * from tabela_que_nao_existe;')
  await page.getByRole('button', { name: /Executar/ }).click()

  await expect(page.getByText(/does not exist|não existe/)).toBeVisible()
})

test('Ctrl+K opens the search and closes it again', async ({ page }) => {
  await page.goto(projectPath())
  await expect(page.locator('main h1').first()).toBeVisible()

  await page.keyboard.press('Control+k')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Control+k')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
