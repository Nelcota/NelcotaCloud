import { test as base, expect } from '@playwright/test'

/**
 * A browser message is not a page error when it only reports an HTTP refusal the test caused
 * on purpose (Storage off answers 503, a refused action 4xx): the page shows those itself.
 */
const EXPECTED = [/^Failed to load resource: the server responded with a status of [45]\d\d/]

/**
 * Every test fails on an uncaught exception or a console error (React warnings included), so a
 * screen that works but logs a broken key, an act() leak or a crash in an effect is caught.
 */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(`exception: ${error.message}`))
      page.on('console', (message) => {
        const text = message.text()

        if (
          message.type() === 'error' &&
          EXPECTED.some((pattern) => pattern.test(text)) === false
        ) {
          errors.push(`console: ${text}`)
        }
      })
      await use(errors)
      expect(errors, 'the page logged errors').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
