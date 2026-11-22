import { describe, expect, it, vi } from 'vitest'

import { createClient, memoryStorage } from '../src/index'
import type { NelcotaClient, StorageUpload } from '../src/index'
import { FakeApi, sessionTokens } from './fake-api'

const API_URL = 'https://api.example.test'
const R2_URL = 'https://example.r2.cloudflarestorage.com/private/object?signature=secret'
const VERIFY_URL = 'https://example.r2.cloudflarestorage.com/private/object?signature=verify'

const signedUpload: StorageUpload = {
  object_id: 'object-a',
  url: R2_URL,
  expires_at: '2026-11-19T15:00:00Z',
  can_upload: true,
  headers: { 'if-none-match': '*', 'content-type': 'text/plain', 'content-length': '3' },
}

async function signedIn(fetch: typeof globalThis.fetch): Promise<NelcotaClient> {
  const client = createClient({
    url: API_URL,
    publishableKey: 'nc_pk_test',
    storage: memoryStorage(),
    fetch,
  })
  await client.auth.signInWithPassword({ email: 'ana@example.com', password: 'secret' })

  return client
}

describe('private project storage', () => {
  it('reserves, streams the Blob without platform credentials, then confirms', async () => {
    const api = new FakeApi()
    api.reply('POST /auth/v1/login', { status: 200, body: sessionTokens() })
    api.reply('POST /storage/v1/buckets/bucket-a/uploads', { status: 201, body: signedUpload })
    api.reply('POST /storage/v1/objects/object-a/complete', {
      status: 200,
      body: { id: 'object-a' },
    })
    const send = vi.fn<typeof fetch>((input, init) => {
      if (input === R2_URL) {
        return Promise.resolve(new Response(null, { status: 200 }))
      }

      return api.fetch(input, init)
    })
    const client = await signedIn(send)
    const file = new Blob(['abc'], { type: 'text/plain' })

    await expect(client.storage.upload('bucket-a', { name: 'report.txt', file })).resolves.toEqual({
      id: 'object-a',
    })
    expect(api.callsTo('POST /storage/v1/buckets/bucket-a/uploads')[0]).toMatchObject({
      headers: { apikey: 'nc_pk_test', authorization: 'Bearer access-token' },
      body: {
        name: 'report.txt',
        size_bytes: 3,
        content_type: 'text/plain',
        request_id: expect.any(String),
      },
    })
    expect(send).toHaveBeenNthCalledWith(3, R2_URL, {
      method: 'PUT',
      headers: new Headers({ 'if-none-match': '*', 'content-type': 'text/plain' }),
      body: file,
      redirect: 'error',
      referrerPolicy: 'no-referrer',
      credentials: 'omit',
    })
    expect(api.callsTo('POST /storage/v1/objects/object-a/complete')).toHaveLength(1)
  })

  it('lists buckets and file pages, obtains a link and deletes a file', async () => {
    const api = new FakeApi()
    api.reply('POST /auth/v1/login', { status: 200, body: sessionTokens() })
    api.reply('GET /storage/v1/buckets', { status: 200, body: [{ id: 'bucket-a' }] })
    api.reply('GET /storage/v1/buckets/bucket-a/objects', {
      status: 200,
      body: { items: [], next_cursor: null },
    })
    api.reply('POST /storage/v1/objects/object-a/download-url', {
      status: 200,
      body: { url: R2_URL },
    })
    api.reply('DELETE /storage/v1/objects/object-a', { status: 204 })
    const client = await signedIn(api.fetch)

    await expect(client.storage.listBuckets()).resolves.toEqual([{ id: 'bucket-a' }])
    await expect(
      client.storage.listObjects('bucket-a', { limit: 5, before: 'cursor' }),
    ).resolves.toEqual({
      items: [],
      next_cursor: null,
    })
    expect(api.callsTo('GET /storage/v1/buckets/bucket-a/objects')[0]?.query).toEqual([
      ['limit', '5'],
      ['before', 'cursor'],
    ])
    await expect(client.storage.downloadUrl('object-a')).resolves.toBe(R2_URL)
    await expect(client.storage.deleteObject('object-a')).resolves.toBeUndefined()
  })

  it('reuses the reservation after the response to confirmation fails', async () => {
    const api = new FakeApi()
    const reserve = 'POST /storage/v1/buckets/bucket-a/uploads'
    const complete = 'POST /storage/v1/objects/object-a/complete'
    api.reply('POST /auth/v1/login', { status: 200, body: sessionTokens() })
    api.reply(reserve, { status: 201, body: signedUpload })
    api.reply(complete, { status: 503, body: { error: 'storage_unavailable', message: 'busy' } })
    api.reply(reserve, {
      status: 201,
      body: { ...signedUpload, can_upload: false, verification_url: VERIFY_URL },
    })
    api.reply(complete, { status: 200, body: { id: 'object-a' } })
    const send = vi.fn<typeof fetch>((input, init) => {
      if (input === R2_URL) {
        return Promise.resolve(new Response(null, { status: 200 }))
      }

      if (input === VERIFY_URL) {
        return Promise.resolve(new Response('abc'))
      }

      return api.fetch(input, init)
    })
    const client = await signedIn(send)
    const file = { name: 'report.txt', file: new Blob(['abc']) }

    await expect(client.storage.upload('bucket-a', file)).rejects.toMatchObject({
      code: 'storage_unavailable',
    })
    await expect(client.storage.upload('bucket-a', file)).resolves.toEqual({ id: 'object-a' })
    const [first, retry] = api.callsTo(reserve)
    expect(first?.body).toMatchObject({ request_id: expect.any(String) })
    expect(retry?.body).toEqual(first?.body)
    expect(send.mock.calls.filter(([input]) => input === R2_URL)).toHaveLength(1)
  })
})
