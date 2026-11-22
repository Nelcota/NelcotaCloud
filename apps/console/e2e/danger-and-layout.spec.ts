import type { Locator } from '@playwright/test'

import { expect, test } from './support/test'

import { expectNoSidewaysScroll, projectPath } from './support/console-page'

/** Red text or a red fill (white text on red), whatever the theme. */
async function expectRed(locator: Locator): Promise<void> {
  const colors = await locator.evaluate((element) => {
    const style = getComputedStyle(element)

    return [style.color, style.backgroundColor]
  })

  expect(colors.some(isRed)).toBe(true)
}

/** The red channel clearly above green and blue. */
function isRed(color: string): boolean {
  const [red = 0, green = 0, blue = 0] = (color.match(/[\d.]+/g) ?? []).map(Number)

  return red > green + 60 && red > blue + 60
}

test('blocking an address is red, in the row and in its dialog', async ({ page }) => {
  await page.goto(projectPath('/activity'))
  await page.getByRole('tab', { name: 'Endereços' }).click()

  const block = page.getByRole('button', { name: 'Bloquear', exact: true }).first()
  await expectRed(block)
  await block.click()
  await expectRed(page.getByRole('dialog').getByRole('button', { name: 'Bloquear', exact: true }))
  await page.keyboard.press('Escape')
})

test('deleting a column is a red icon', async ({ page }) => {
  await page.goto(projectPath('/database/e2e_itens'))
  await page.getByRole('tab', { name: /Colunas/ }).click()

  await expectRed(page.getByRole('button', { name: 'Excluir a coluna cidade' }))
})

for (const path of ['', '/users', '/activity', '/database', '/team', '/settings']) {
  test(`fits a phone screen without sideways scroll: ${path || 'overview'}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(projectPath(path))
    await expect(page.locator('main h1').first()).toBeVisible()

    await expectNoSidewaysScroll(page)
  })
}
