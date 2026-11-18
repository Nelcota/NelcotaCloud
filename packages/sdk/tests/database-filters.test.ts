import { describe, expect, it } from 'vitest'

import { createClient, memoryStorage } from '../src/index'
import type { NelcotaClient } from '../src/index'
import { FakeApi } from './fake-api'

function clientFor(api: FakeApi): NelcotaClient {
  return createClient({
    url: 'https://api.test',
    publishableKey: 'nc_pk_test',
    storage: memoryStorage(),
    fetch: api.fetch,
  })
}

describe('database filters', () => {
  it('turns null equality into is.null and quotes array elements', async () => {
    const api = new FakeApi()
    const client = clientFor(api)
    api.reply('GET /rest/v1/posts', { status: 200, body: [] })

    await client
      .from('posts')
      .select()
      .eq('deleted_at', null)
      .neq('archived_at', null)
      .match({ team_id: null })
      .in('id', [1, null])
      .eq('title', '')
      .contains('tags', ['', 'null', '{x}', 2])
      .execute()

    const call = api.callsTo('GET /rest/v1/posts')[0]
    expect(call?.query).toEqual([
      ['select', '*'],
      ['deleted_at', 'is.null'],
      ['archived_at', 'not.is.null'],
      ['team_id', 'is.null'],
      ['id', 'in.(1)'],
      ['title', 'eq.""'],
      ['tags', 'cs.{"","null","{x}",2}'],
    ])
  })
})
