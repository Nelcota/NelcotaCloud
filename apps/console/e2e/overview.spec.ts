import { expect, test } from './support/test'

import { projectPath } from './support/console-page'
import { readStack } from './support/stack'

test('the projects page lists the project and opens its overview', async ({ page }) => {
  const stack = readStack()
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Projetos' })).toBeVisible()
  await page.getByRole('link', { name: stack.projectName }).first().click()

  await expect(page).toHaveURL(new RegExp(`/projects/${stack.projectId}$`))
  await expect(page.getByRole('heading', { name: stack.projectName })).toBeVisible()
})

test('the overview says its verdict once and lists the setup left to do', async ({ page }) => {
  await page.goto(projectPath())

  await expect(page.getByText(/Configuração \d de 5\. Próximo passo:/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Próximos passos' })).toBeVisible()
  await expect(page.getByText('Saudável', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Requisições à API')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Serviços' })).toBeVisible()
  await expect(page.getByText('Não configurado')).toBeVisible()
})
