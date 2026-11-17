import { describe, expect, it } from 'vitest'

import { NelcotaError, createClient, memoryStorage } from '../src/index'
import type { NelcotaClient } from '../src/index'
import { FakeApi, sessionTokens } from './fake-api'

function clientFor(api: FakeApi): NelcotaClient {
  return createClient({
    url: 'https://api.test',
    publishableKey: 'nc_pk_test',
    storage: memoryStorage(),
    fetch: api.fetch,
  })
}

describe('database queries', () => {
  it('reads rows with filters, order and a page, anonymously without a session', async () => {
    const api = new FakeApi()
    const client = clientFor(api)
    api.reply('GET /rest/v1/posts', {
      status: 200,
      body: [{ id: 1, title: 'Rust tips' }],
      headers: { 'content-range': '0-0/42' },
    })

    const { data, count } = await client
      .from<{ id: number; title: string }>('posts')
      .select('id, title, author:authors(name)', { count: 'exact' })
      .eq('published', true)
      .gte('views', 100)
      .in('tag', ['rust', 'a,b'])
      .eq('quote', 'say "hi"')
      .not('id', 'in', [1, 2])
      .is('deleted_at', null)
      .or('title.ilike.*rust*,views.gt.1000')
      .order('created_at', { ascending: false, nullsFirst: false })
      .order('id', { referencedTable: 'comments' })
      .range(20, 29)
      .execute()

    const call = api.callsTo('GET /rest/v1/posts')[0]
    expect(call?.query).toEqual([
      ['select', 'id,title,author:authors(name)'],
      ['published', 'eq.true'],
      ['views', 'gte.100'],
      ['tag', 'in.(rust,"a,b")'],
      ['quote', 'eq."say \\"hi\\""'],
      ['id', 'not.in.(1,2)'],
      ['deleted_at', 'is.null'],
      ['or', '(title.ilike.*rust*,views.gt.1000)'],
      ['order', 'created_at.desc.nullslast'],
      ['comments.order', 'id.asc'],
      ['offset', '20'],
      ['limit', '10'],
    ])
    expect(call?.headers.prefer).toBe('count=exact')
    expect(call?.headers.authorization).toBeUndefined()
    expect(call?.headers.apikey).toBe('nc_pk_test')
    expect(data).toEqual([{ id: 1, title: 'Rust tips' }])
    expect(count).toBe(42)
  })

  it('sends the user access token once logged in', async () => {
    const api = new FakeApi()
    const client = clientFor(api)
    api.reply('POST /auth/v1/login', { status: 200, body: sessionTokens() })
    await client.auth.signInWithPassword({ email: 'ana@example.com', password: 'secret' })
    api.reply('GET /rest/v1/notes', { status: 200, body: { id: 1 } })

    const { data } = await client.from('notes').select().eq('id', 1).single().execute()

    const call = api.callsTo('GET /rest/v1/notes')[0]
    expect(call?.headers.authorization).toBe('Bearer access-token')
    expect(call?.headers.accept).toBe('application/vnd.pgrst.object+json')
    expect(data).toEqual({ id: 1 })
  })

  it('writes rows and asks for them back with select', async () => {
    const api = new FakeApi()
    const client = clientFor(api)
    api.reply('POST /rest/v1/products', { status: 201, body: [{ sku: 'a' }] })
    api.reply('PATCH /rest/v1/products', { status: 204 })
    api.reply('DELETE /rest/v1/products', { status: 204 })

    const inserted = await client
      .from('products')
      .upsert([{ sku: 'a', stock: 1 }], { onConflict: 'sku' })
      .select('sku')
      .execute()
    await client.from('products').update({ stock: 0 }).eq('sku', 'a').execute()
    const deleted = await client.from('products').delete().eq('sku', 'a').execute()

    const upsert = api.callsTo('POST /rest/v1/products')[0]
    expect(upsert?.body).toEqual([{ sku: 'a', stock: 1 }])
    expect(upsert?.query).toEqual([
      ['on_conflict', 'sku'],
      ['select', 'sku'],
    ])
    expect(upsert?.headers.prefer).toBe('resolution=merge-duplicates,return=representation')
    expect(inserted.data).toEqual([{ sku: 'a' }])
    expect(api.callsTo('PATCH /rest/v1/products')[0]?.body).toEqual({ stock: 0 })
    expect(deleted.data).toBeUndefined()
  })

  it('calls functions and reports API errors', async () => {
    const api = new FakeApi()
    const client = clientFor(api)
    api.reply('POST /rest/v1/rpc/add', { status: 200, body: 3 })
    api.reply('GET /rest/v1/secrets', {
      status: 403,
      body: { error: 'permission_denied', message: 'denied' },
    })

    const sum = await client.rpc<number>('add', { a: 1, b: 2 })
    const failure = await client
      .from('secrets')
      .select()
      .execute()
      .then(
        () => null,
        (error: unknown) => error,
      )

    expect(api.callsTo('POST /rest/v1/rpc/add')[0]?.body).toEqual({ a: 1, b: 2 })
    expect(sum.data).toBe(3)
    expect(failure).toBeInstanceOf(NelcotaError)
    expect((failure as NelcotaError).code).toBe('permission_denied')
  })
})
