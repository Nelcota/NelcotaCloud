import { describe, expect, it } from 'vitest'

import { createClient, memoryStorage, NelcotaError } from '../src/index'
import type { AuthEvent, NelcotaClient } from '../src/index'
import { FakeApi, sessionTokens } from './fake-api'

const API_URL = 'https://api.test/'
const PUBLISHABLE_KEY = 'nc_pk_test'
const CREDENTIALS = { email: 'ana@example.com', password: 'correct horse battery' }

function clientFor(api: FakeApi): NelcotaClient {
  return createClient({
    url: API_URL,
    publishableKey: PUBLISHABLE_KEY,
    storage: memoryStorage(),
    fetch: api.fetch,
  })
}

describe('signInWithPassword', () => {
  it('stores the session and tells listeners', async () => {
    const api = new FakeApi()
    api.reply('POST /auth/v1/login', { status: 200, body: sessionTokens() })
    const client = clientFor(api)
    const events: AuthEvent[] = []
    client.auth.onAuthStateChange((event) => events.push(event))

    const result = await client.auth.signInWithPassword(CREDENTIALS)

    expect(result.kind).toBe('session')
    expect(client.auth.getSession()?.user.email).toBe('ana@example.com')
    expect(events).toEqual(['SIGNED_IN'])
    expect(api.calls[0]?.headers.apikey).toBe(PUBLISHABLE_KEY)
  })

  it('returns the MFA step without storing a session', async () => {
    const api = new FakeApi()
    api.reply('POST /auth/v1/login', {
      status: 200,
      body: { mfa_required: true, mfa_token: 'nc_mfa_x' },
    })
    const client = clientFor(api)

    const result = await client.auth.signInWithPassword(CREDENTIALS)

    expect(result).toEqual({ kind: 'mfa_required', mfaToken: 'nc_mfa_x' })
    expect(client.auth.getSession()).toBeNull()
  })

  it('rejects a response with null session fields without storing it', async () => {
    const api = new FakeApi()
    api.reply('POST /auth/v1/login', {
      status: 200,
      body: { access_token: 'access', refresh_token: 'refresh', expires_in: null, user: null },
    })
    const client = clientFor(api)

    await expect(client.auth.signInWithPassword(CREDENTIALS)).rejects.toMatchObject({
      code: 'invalid_response',
    })
    expect(client.auth.getSession()).toBeNull()
  })

  it.each([1.5, Number.MAX_VALUE])(
    'rejects an unsafe expires_in value (%s) without storing a session',
    async (expiresIn) => {
      const api = new FakeApi()
      api.reply('POST /auth/v1/login', {
        status: 200,
        body: { ...sessionTokens(), expires_in: expiresIn },
      })
      const client = clientFor(api)

      await expect(client.auth.signInWithPassword(CREDENTIALS)).rejects.toMatchObject({
        code: 'invalid_response',
      })
      expect(client.auth.getSession()).toBeNull()
    },
  )

  it('turns API errors into NelcotaError with the request id', async () => {
    const api = new FakeApi()
    const body = { error: 'invalid_credentials', message: 'invalid email or password' }
    api.reply('POST /auth/v1/login', { status: 401, body, headers: { 'x-request-id': 'req-1' } })

    const failure = await clientFor(api)
      .auth.signInWithPassword(CREDENTIALS)
      .catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(NelcotaError)
    expect(failure).toMatchObject({ status: 401, code: 'invalid_credentials', requestId: 'req-1' })
  })
})

describe('session renewal', () => {
  it('shares one refresh between concurrent callers', async () => {
    const api = new FakeApi()
    api.reply('POST /auth/v1/login', { status: 200, body: sessionTokens({ expiresIn: 1 }) })
    api.reply('POST /auth/v1/refresh', {
      status: 200,
      body: sessionTokens({ refreshToken: 'nc_rt_second' }),
    })
    const client = clientFor(api)
    await client.auth.signInWithPassword(CREDENTIALS)

    const tokens = await Promise.all([client.auth.getAccessToken(), client.auth.getAccessToken()])

    expect(tokens).toEqual(['access-token', 'access-token'])
    expect(api.callsTo('POST /auth/v1/refresh')).toHaveLength(1)
    expect(client.auth.getSession()?.refreshToken).toBe('nc_rt_second')
  })

  it('signs out when the refresh token is refused', async () => {
    const api = new FakeApi()
    api.reply('POST /auth/v1/login', { status: 200, body: sessionTokens({ expiresIn: 1 }) })
    api.reply('POST /auth/v1/refresh', {
      status: 401,
      body: { error: 'invalid_refresh_token', message: 'x' },
    })
    const client = clientFor(api)
    await client.auth.signInWithPassword(CREDENTIALS)

    const failure = await client.auth.getAccessToken().catch((error: unknown) => error)

    expect(failure).toMatchObject({ code: 'not_authenticated' })
    expect(client.auth.getSession()).toBeNull()
  })
})

describe('signOut', () => {
  it('forgets the session even when the server cannot be reached', async () => {
    const api = new FakeApi()
    api.reply('POST /auth/v1/login', { status: 200, body: sessionTokens() })
    api.reply('POST /auth/v1/logout', {
      status: 503,
      body: { error: 'unavailable', message: 'down' },
    })
    const client = clientFor(api)
    await client.auth.signInWithPassword(CREDENTIALS)

    await expect(client.auth.signOut()).rejects.toBeInstanceOf(NelcotaError)

    expect(client.auth.getSession()).toBeNull()
  })
})

describe('createClient', () => {
  it('refuses the secret key', () => {
    expect(() => createClient({ url: API_URL, publishableKey: 'nc_sk_oops' })).toThrow(/secret key/)
  })

  it('ignores a corrupted stored session', () => {
    const storage = memoryStorage()
    storage.setItem('nelcota-session', '{"accessToken": 1}')

    const client = createClient({
      url: API_URL,
      publishableKey: PUBLISHABLE_KEY,
      storage,
      fetch: new FakeApi().fetch,
    })

    expect(client.auth.getSession()).toBeNull()
  })
})
