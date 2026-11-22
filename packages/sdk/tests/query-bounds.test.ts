import { describe, expect, it } from 'vitest'

import { createClient, memoryStorage } from '../src/index'
import { FakeApi } from './fake-api'

function clientFor(api: FakeApi): ReturnType<typeof createClient> {
  return createClient({
    url: 'https://api.test',
    publishableKey: 'nc_pk_test',
    storage: memoryStorage(),
    fetch: api.fetch,
  })
}

describe('query execution and bounds', () => {
  it('keeps derived query shapes and filters independent', async () => {
    const api = new FakeApi()
    const client = clientFor(api)
    const original = client.from('notes').select('id').order('title')
    const single = original.single().eq('id', 1).order('id')
    api.reply('GET /rest/v1/notes', { status: 200, body: [{ id: 1 }, { id: 2 }] })
    api.reply('GET /rest/v1/notes', { status: 200, body: { id: 1 } })

    const [many, one] = await Promise.all([original.execute(), single.execute()])
    const [first, second] = api.callsTo('GET /rest/v1/notes')

    expect(many.data).toEqual([{ id: 1 }, { id: 2 }])
    expect(one.data).toEqual({ id: 1 })
    expect(first?.headers.accept).toBeUndefined()
    expect(first?.query).toEqual([
      ['select', 'id'],
      ['order', 'title.asc'],
    ])
    expect(second?.headers.accept).toBe('application/vnd.pgrst.object+json')
    expect(second?.query).toEqual([
      ['select', 'id'],
      ['order', 'title.asc,id.asc'],
      ['id', 'eq.1'],
    ])
  })

  it('captures a request before awaiting authorization', async () => {
    const api = new FakeApi()
    const client = clientFor(api)
    const values = { title: 'Before' }
    const query = client.from('notes').update(values).eq('id', 1)
    api.reply('PATCH /rest/v1/notes', { status: 204 })
    const sending = query.execute()

    values.title = 'After'
    query.eq('archived', false)
    await sending

    const [call] = api.callsTo('PATCH /rest/v1/notes')
    expect(call?.query).toEqual([['id', 'eq.1']])
    expect(call?.body).toEqual({ title: 'Before' })
  })

  it('refuses row counts that are not whole numbers of 0 or more', () => {
    const api = new FakeApi()
    const client = clientFor(api)
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
    const client = clientFor(api)

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
