import { describe, expect, it, vi } from 'vitest'

import type { NelcotaClient } from '../src/index'
import { createClient, memoryStorage } from '../src/index'
import { FakeApi, sessionTokens } from './fake-api'

const CALLBACK = 'https://app.test/callback?tab=account'
const REDEEM = 'POST /auth/v1/oauth/token'

async function openCallback(client: NelcotaClient): Promise<URL> {
  const authorize = new URL(
    await client.auth.oauth.getAuthorizeUrl({ provider: 'google', redirectTo: CALLBACK }),
  )
  const callback = new URL(authorize.searchParams.get('redirect_to') ?? '')
  callback.searchParams.set('code', 'nc_oc_example')

  return callback
}

describe('OAuth continuation', () => {
  it('retries a transport failure without losing the original verifier', async () => {
    const api = new FakeApi()
    api.reply(REDEEM, { status: 200, body: sessionTokens() })
    const send = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('Network unavailable'))
      .mockImplementation(api.fetch)
    const client = createClient({
      url: 'https://api.test',
      publishableKey: 'nc_pk_test',
      storage: memoryStorage(),
      fetch: send,
    })
    const callback = await openCallback(client)

    await expect(client.auth.oauth.exchangeCode(callback)).rejects.toThrow('Network unavailable')
    await expect(client.auth.oauth.exchangeCode(callback)).resolves.toMatchObject({
      kind: 'session',
    })
    expect(send).toHaveBeenCalledTimes(2)
    expect(send.mock.calls[0]?.[1]?.body).toEqual(send.mock.calls[1]?.[1]?.body)
    await expect(client.auth.oauth.exchangeCode(callback)).rejects.toMatchObject({
      code: 'missing_pkce_verifier',
    })
  })

  it('cleans up old attempts while keeping a new callback usable', async () => {
    const api = new FakeApi()
    api.reply(REDEEM, { status: 200, body: sessionTokens() })
    const storage = memoryStorage()
    let now = Date.now()
    const client = createClient({
      url: 'https://api.test',
      publishableKey: 'nc_pk_test',
      storage,
      now: () => now,
      fetch: api.fetch,
    })
    const abandoned = await openCallback(client)
    const oldState = abandoned.searchParams.get('nelcota_state')
    const oldKey = 'nelcota-session-pkce-verifier-' + oldState
    expect(storage.getItem(oldKey)).not.toBeNull()
    now += 13 * 60 * 1_000
    const active = await openCallback(client)

    expect(storage.getItem(oldKey)).toBeNull()
    await expect(client.auth.oauth.exchangeCode(abandoned)).rejects.toMatchObject({
      code: 'missing_pkce_verifier',
    })
    await expect(client.auth.oauth.exchangeCode(active)).resolves.toMatchObject({ kind: 'session' })
    expect(api.callsTo(REDEEM)).toHaveLength(1)
  })

  it('drops the verifier after the API definitively rejects a code', async () => {
    const api = new FakeApi()
    api.reply(REDEEM, {
      status: 401,
      body: { error: 'invalid_oauth_code', message: 'The OAuth code is invalid.' },
    })
    const client = createClient({
      url: 'https://api.test',
      publishableKey: 'nc_pk_test',
      storage: memoryStorage(),
      fetch: api.fetch,
    })
    const callback = await openCallback(client)

    await expect(client.auth.oauth.exchangeCode(callback)).rejects.toMatchObject({
      code: 'invalid_oauth_code',
    })
    await expect(client.auth.oauth.exchangeCode(callback)).rejects.toMatchObject({
      code: 'missing_pkce_verifier',
    })
    expect(api.callsTo(REDEEM)).toHaveLength(1)
  })
})
