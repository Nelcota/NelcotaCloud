import { describe, expect, it } from 'vitest'

import { createClient, memoryStorage } from '../src/index'
import { FakeApi } from './fake-api'

describe('query bounds', () => {
  it('refuses row counts that are not whole numbers of 0 or more', () => {
    const api = new FakeApi()
    const client = createClient({
      url: 'https://api.test',
      publishableKey: 'nc_pk_test',
      storage: memoryStorage(),
      fetch: api.fetch,
    })
    const posts = () => client.from('posts').select()

    for (const count of [Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY]) {
      expect(() => posts().limit(count)).toThrow(RangeError)
    }

    expect(() => posts().range(10, 5)).toThrow(RangeError)
    expect(() => posts().range(0, Number.NaN)).toThrow(RangeError)
    expect(() => posts().range(0, 0)).not.toThrow()
  })

  it('reads no count from a malformed Content-Range', async () => {
    const api = new FakeApi()
    const client = createClient({
      url: 'https://api.test',
      publishableKey: 'nc_pk_test',
      storage: memoryStorage(),
      fetch: api.fetch,
    })

    const cases: [string, number | null][] = [
      ['0-24/', null],
      ['0-24/1e3', null],
      ['junk', null],
      ['*/0', 0],
    ]

    for (const [header, expected] of cases) {
      api.reply('GET /rest/v1/posts', {
        status: 200,
        body: [],
        headers: { 'content-range': header },
      })
      const { count } = await client.from('posts').select('*', { count: 'exact' }).execute()

      expect(count).toBe(expected)
    }
  })
})
