import { describe, expect, it } from 'vitest'

import { createClient, memoryStorage } from '../src/index'
import type { SessionStorageAdapter } from '../src/index'
import { FakeApi, sessionTokens } from './fake-api'

const API_URL = 'https://api.test'
const PUBLISHABLE_KEY = 'nc_pk_test'

function clientWith(api: FakeApi, storage: SessionStorageAdapter): ReturnType<typeof createClient> {
  return createClient({ url: API_URL, publishableKey: PUBLISHABLE_KEY, storage, fetch: api.fetch })
}

describe('responses without a body', () => {
  it('resolves 202 Accepted with an empty body', async () => {
    const api = new FakeApi()
    api.reply('POST /auth/v1/magic-link', { status: 202 })
    api.reply('POST /auth/v1/recover', { status: 202 })

    const client = clientWith(api, memoryStorage())

    await expect(client.auth.sendMagicLink({ email: 'ana@example.com' })).resolves.toBeUndefined()
    await expect(client.auth.recoverPassword({ email: 'ana@example.com' })).resolves.toBeUndefined()
  })
})

describe('several tabs', () => {
  it('adopts the session another tab already renewed instead of reusing its refresh token', async () => {
    const api = new FakeApi()
    const sharedStorage = memoryStorage()
    api.reply('POST /auth/v1/login', { status: 200, body: sessionTokens({ expiresIn: 1 }) })
    api.reply('POST /auth/v1/refresh', {
      status: 200,
      body: sessionTokens({ refreshToken: 'nc_rt_second' }),
    })
    const firstTab = clientWith(api, sharedStorage)
    await firstTab.auth.signInWithPassword({
      email: 'ana@example.com',
      password: 'secret-password',
    })
    const secondTab = clientWith(api, sharedStorage)

    await firstTab.auth.getAccessToken()
    await secondTab.auth.getAccessToken()

    expect(api.callsTo('POST /auth/v1/refresh')).toHaveLength(1)
    expect(secondTab.auth.getSession()?.refreshToken).toBe('nc_rt_second')
  })
})

describe('stored session', () => {
  it('ignores a session whose expiry is not a finite number', () => {
    const storage = memoryStorage()
    const user = { id: 'user-id', email: 'ana@example.com' }
    storage.setItem(
      'nelcota-session',
      JSON.stringify({ accessToken: 'a', refreshToken: 'r', expiresAt: null, user }),
    )

    expect(clientWith(new FakeApi(), storage).auth.getSession()).toBeNull()
  })

  it('ignores a session whose user is missing required fields', () => {
    const storage = memoryStorage()
    const user = { id: 'user-id', email: 'ana@example.com' }
    storage.setItem(
      'nelcota-session',
      JSON.stringify({ accessToken: 'a', refreshToken: 'r', expiresAt: Date.now() + 60000, user }),
    )

    expect(clientWith(new FakeApi(), storage).auth.getSession()).toBeNull()
  })
})
