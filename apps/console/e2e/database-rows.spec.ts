import type { Page } from '@playwright/test'

import { expect, test } from './support/test'

import { projectPath } from './support/console-page'
import { readStack } from './support/stack'

test.beforeEach(async ({ page }) => {
  await page.goto(projectPath(`/database/${readStack().table}`))
  await expect(page.getByRole('table', { name: /Linhas de/ })).toBeVisible()
})

function grid(page: Page): ReturnType<Page['getByRole']> {
  return page.getByRole('table', { name: /Linhas de/ })
}

async function pickOption(page: Page, label: string, option: string): Promise<void> {
  await page.getByRole('combobox', { name: label }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

test('filters rows by a column and removes the filter', async ({ page }) => {
  await page.getByRole('button', { name: 'Filtrar' }).click()
  await pickOption(page, 'Coluna', 'cidade')
  await pickOption(page, 'Condição', 'contém')
  await page.getByRole('textbox', { name: 'Valor' }).fill('rec')
  await page.getByRole('button', { name: 'Aplicar filtro' }).click()

  await expect(page.getByText('cidade contém rec')).toBeVisible()
  await expect(grid(page).getByText('Curitiba')).toHaveCount(0)
  await expect(grid(page).getByText('Recife')).toHaveCount(2)

  await page.getByRole('button', { name: 'Remover filtro cidade contém rec' }).click()
  await expect(grid(page).getByText('Curitiba')).toBeVisible()
})

test('inserts, edits and deletes a row through the side panel', async ({ page }) => {
  await page.getByRole('button', { name: 'Linha', exact: true }).click()
  await page.getByLabel(/^nome/).fill('Garrafa')
  await page.getByRole('button', { name: 'Inserir linha' }).click()
  await expect(grid(page).getByText('Garrafa')).toBeVisible()

  await page.getByRole('button', { name: 'Ver linha 4' }).click()
  const nome = page.getByLabel(/^nome/)
  await nome.fill('Garrafa térmica')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(grid(page).getByText('Garrafa térmica')).toBeVisible()

  await page.getByRole('button', { name: 'Ver linha 4' }).click()
  await page.getByRole('button', { name: 'Excluir linha' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Excluir linha' }).click()
  await expect(grid(page).getByText('Garrafa térmica')).toHaveCount(0)
})

test('the columns tab lists the primary key index', async ({ page }) => {
  await page.getByRole('tab', { name: /Colunas/ }).click()

  await expect(page.getByRole('heading', { name: 'Índices' })).toBeVisible()
  await expect(page.getByText('e2e_itens_pkey')).toBeVisible()
})
