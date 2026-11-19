import { describe, expect, it, vi } from 'vitest'

import {
  StorageUploadInterruptedError,
  createClient,
  memoryStorage,
  putStorageObject,
} from '../src/index'
import type { NelcotaClient, StorageUpload } from '../src/index'
import { FakeApi, sessionTokens } from './fake-api'

const API_URL = 'https://api.example.test'
const R2_URL = 'https://example.r2.cloudflarestorage.com/private/object?signature=secret'

const signedUpload: StorageUpload = {
  object_id: 'object-a',
  url: R2_URL,
  expires_at: '2026-11-19T15:00:00Z',
  confirm_until: '2026-11-19T15:15:00Z',
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
      body: { name: 'report.txt', size_bytes: 3, content_type: 'text/plain' },
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

  it('retains the confirmation ID after a failed response without creating another reservation', async () => {
    const api = new FakeApi()
    api.reply('POST /auth/v1/login', { status: 200, body: sessionTokens() })
    api.reply('POST /storage/v1/buckets/bucket-a/uploads', { status: 201, body: signedUpload })
    api.reply('POST /storage/v1/objects/object-a/complete', { status: 503 })
    const client = await signedIn((input, init) => {
      if (input === R2_URL) {
        return Promise.resolve(new Response(null, { status: 200 }))
      }

      return api.fetch(input, init)
    })
    const file = new Blob(['abc'], { type: 'text/plain' })
    const attempt = client.storage.upload('bucket-a', { name: 'report.txt', file })
    await expect(attempt).rejects.toBeInstanceOf(StorageUploadInterruptedError)
    await expect(attempt).rejects.toMatchObject({
      objectId: 'object-a',
      confirmUntil: signedUpload.confirm_until,
    })

    api.reply('POST /storage/v1/objects/object-a/complete', {
      status: 200,
      body: { id: 'object-a' },
    })
    await expect(client.storage.completeUpload('object-a')).resolves.toMatchObject({
      id: 'object-a',
    })
    expect(api.callsTo('POST /storage/v1/buckets/bucket-a/uploads')).toHaveLength(1)
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

  it('rejects a Blob whose size does not match the signed request before sending', async () => {
    const send = vi.fn<typeof fetch>()
    await expect(
      putStorageObject(signedUpload, new Blob(['too long']), send),
    ).rejects.toMatchObject({
      code: 'storage_upload_failed',
    })
    expect(send).not.toHaveBeenCalled()
  })
})
