import { describe, expect, it } from 'vitest'

import { waitForHealth } from '../src/dev/wait-for-health'
import { withIgnoredEntry } from '../src/project/gitignore'

describe('withIgnoredEntry', () => {
  it('adds the line once, keeping the file ending', () => {
    expect(withIgnoredEntry('')).toBe('.nelcota/\n')
    expect(withIgnoredEntry('node_modules\n')).toBe('node_modules\n.nelcota/\n')
    expect(withIgnoredEntry('node_modules')).toBe('node_modules\n.nelcota/\n')
  })

  it('recognises the folder already ignored in any spelling', () => {
    expect(withIgnoredEntry('dist\r\n.nelcota/\r\n')).toBeUndefined()
    expect(withIgnoredEntry('/.nelcota\n')).toBeUndefined()
    expect(withIgnoredEntry('  .nelcota  \n')).toBeUndefined()
  })
})

/** Unavailable twice, then up. */
function statusAfter(calls: number): number {
  if (calls < 3) {
    return 503
  }

  return 200
}

describe('waitForHealth', () => {
  it('polls until /health answers 200', async () => {
    let calls = 0
    let clock = 0
    const healthy = await waitForHealth(
      'http://localhost:54320',
      {
        fetch: async () => {
          calls += 1

          return new Response(null, { status: statusAfter(calls) })
        },
        now: () => new Date(clock),
        sleep: async (milliseconds) => {
          clock += milliseconds
        },
      },
      60_000,
    )

    expect(healthy).toBe(true)
    expect(calls).toBe(3)
  })

  it('gives up after the timeout', async () => {
    let clock = 0
    const healthy = await waitForHealth(
      'http://localhost:54320',
      {
        fetch: async () => {
          throw new TypeError('fetch failed')
        },
        now: () => new Date(clock),
        sleep: async (milliseconds) => {
          clock += milliseconds
        },
      },
      5_000,
    )

    expect(healthy).toBe(false)
    expect(clock).toBe(5_000)
  })
})
