import { describe, expect, it } from 'vitest'

import { createClient, memoryStorage } from '../src/index'
import type { AuthEvent, NelcotaClient } from '../src/index'
import { FakeApi, sessionTokens } from './fake-api'

const API_URL = 'https://api.test/'
const PUBLISHABLE_KEY = 'nc_pk_test'
const USER_ID = '7d5e3c1a-0000-4000-8000-000000000001'
const UPDATED_AT = '2026-11-16T13:00:00Z'

function clientFor(api: FakeApi): NelcotaClient {
  return createClient({
    url: API_URL,
    publishableKey: PUBLISHABLE_KEY,
    storage: memoryStorage(),
    fetch: api.fetch,
  })
}

async function signedIn(api: FakeApi): Promise<NelcotaClient> {
  api.reply('POST /auth/v1/login', { status: 200, body: sessionTokens() })
  const client = clientFor(api)
  await client.auth.signInWithPassword({ email: 'ana@example.com', password: 'secret' })

  return client
}

function userWithPhoto(): object {
  const tokens = sessionTokens() as { user: object }

  return { ...tokens.user, avatar_updated_at: UPDATED_AT }
}

describe('avatar.upload', () => {
  it('sends the file as is and keeps the session user current', async () => {
    const api = new FakeApi()
    const client = await signedIn(api)
    const events: AuthEvent[] = []
    client.auth.onAuthStateChange((event) => events.push(event))
    api.reply('PUT /auth/v1/user/avatar', { status: 200, body: userWithPhoto() })
    const image = new Blob(['jpeg bytes'], { type: 'image/jpeg' })

    const user = await client.auth.avatar.upload(image)

    const call = api.callsTo('PUT /auth/v1/user/avatar')[0]
    expect(call?.body).toBe(image)
    expect(call?.headers['content-type']).toBe('application/octet-stream')
    expect(call?.headers.authorization).toBe('Bearer access-token')
    expect(user.avatar_updated_at).toBe(UPDATED_AT)
    expect(client.auth.getSession()?.user.avatar_updated_at).toBe(UPDATED_AT)
    expect(events).toEqual(['USER_UPDATED'])
  })

  it('fails without a session', async () => {
    const client = clientFor(new FakeApi())

    await expect(client.auth.avatar.upload(new Blob(['x']))).rejects.toMatchObject({
      code: 'not_authenticated',
    })
  })
})

describe('avatar.remove', () => {
  it('clears the photo from the session user', async () => {
    const api = new FakeApi()
    const client = await signedIn(api)
    api.reply('PUT /auth/v1/user/avatar', { status: 200, body: userWithPhoto() })
    await client.auth.avatar.upload(new Blob(['x']))
    api.reply('DELETE /auth/v1/user/avatar', { status: 204 })

    await client.auth.avatar.remove()

    expect(client.auth.getSession()?.user.avatar_updated_at).toBeNull()
  })
})

describe('avatar.url', () => {
  it('builds a public URL with the publishable key and the photo version', () => {
    const client = clientFor(new FakeApi())

    const url = client.auth.avatar.url({ id: USER_ID, avatar_updated_at: UPDATED_AT })

    expect(url).toBe(
      `https://api.test/auth/v1/users/${USER_ID}/avatar?apikey=nc_pk_test&version=2026-11-16T13%3A00%3A00Z`,
    )
  })

  it('is null without a photo', () => {
    const client = clientFor(new FakeApi())

    expect(client.auth.avatar.url({ id: USER_ID, avatar_updated_at: null })).toBeNull()
    expect(client.auth.avatar.url({ id: USER_ID })).toBeNull()
  })
})
