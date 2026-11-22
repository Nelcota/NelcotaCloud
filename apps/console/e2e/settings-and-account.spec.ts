import { projectPath } from './support/console-page'
import { readStack } from './support/stack'
import { expect, test } from './support/test'

test('renames the project and the header follows', async ({ page }) => {
  const original = readStack().projectName
  const renamed = `${original} Renomeada`
  await page.goto(projectPath('/settings'))

  const name = page.getByRole('textbox', { name: /Nome do projeto/ })
  await name.fill(renamed)
  await page.getByRole('button', { name: 'Salvar' }).first().click()
  await expect(
    page.getByRole('navigation', { name: /breadcrumb|Trilha/i }).getByText(renamed),
  ).toBeVisible()

  await name.fill(original)
  await page.getByRole('button', { name: 'Salvar' }).first().click()
  await expect(
    page.getByRole('navigation', { name: /breadcrumb|Trilha/i }).getByText(original),
  ).toBeVisible()
})

test('the account page shows how the account signs in and its sessions', async ({ page }) => {
  await page.goto('/account')

  await expect(page.getByText('Entra com')).toBeVisible()
  await expect(page.getByText('Senha', { exact: true }).first()).toBeVisible()
  await page.getByRole('tab', { name: 'Sessões' }).click()
  await expect(page.getByText('Esta sessão')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Encerrar outras sessões' })).toBeVisible()
})

test('a page that does not exist says so', async ({ page }) => {
  await page.goto('/isso-nao-existe')

  await expect(page.getByText(/não encontrad/i).first()).toBeVisible()
})
