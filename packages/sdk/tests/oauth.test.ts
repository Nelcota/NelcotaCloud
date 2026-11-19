import { describe, expect, it, vi } from 'vitest'

import { challengeFor } from '../src/auth/oauth/pkce'
import { SessionManager } from '../src/auth/session/session-manager'
import { SessionStore } from '../src/auth/session/session-store'
import { HttpClient } from '../src/http/http-client'
import { OAuthApi, createClient, memoryStorage } from '../src/index'
import { FakeApi, sessionTokens } from './fake-api'

const CALLBACK_URL = 'https://app.test/callback'

function clientFor(api: FakeApi): ReturnType<typeof createClient> {
  return createClient({
    url: 'https://api.test',
    publishableKey: 'nc_pk_test',
    storage: memoryStorage(),
    fetch: api.fetch,
  })
}

describe('PKCE', () => {
  it('matches the RFC 7636 S256 example', async () => {
    const challenge = await challengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')

    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })
})

describe('OAuth', () => {
  it('sends the challenge out and the matching verifier back', async () => {
    const api = new FakeApi()
    api.reply('POST /auth/v1/oauth/token', { status: 200, body: sessionTokens() })
    const client = clientFor(api)

    const authorizeUrl = new URL(
      await client.auth.oauth.getAuthorizeUrl({
        provider: 'github',
        redirectTo: CALLBACK_URL,
      }),
    )
    const callback = new URL(authorizeUrl.searchParams.get('redirect_to') ?? '')
    const result = await client.auth.oauth.exchangeCode(
      `${CALLBACK_URL}?code=nc_oc_code&nelcota_state=${callback.searchParams.get('nelcota_state')}`,
    )

    expect(authorizeUrl.pathname).toBe('/auth/v1/oauth/github/authorize')
    expect(authorizeUrl.searchParams.get('code_challenge_method')).toBe('S256')
    const body = api.callsTo('POST /auth/v1/oauth/token')[0]?.body as { code_verifier: string }
    expect(await challengeFor(body.code_verifier)).toBe(
      authorizeUrl.searchParams.get('code_challenge'),
    )
    expect(result.kind).toBe('session')
  })

  it('refuses a code when no login was started here', async () => {
    const client = clientFor(new FakeApi())

    await expect(
      client.auth.oauth.exchangeCode(`${CALLBACK_URL}?code=nc_oc_code`),
    ).rejects.toMatchObject({
      code: 'missing_pkce_verifier',
    })
  })

  it('completes a login started with the previous PKCE storage format', async () => {
    const api = new FakeApi()
    api.reply('POST /auth/v1/oauth/token', { status: 200, body: sessionTokens() })
    const storage = memoryStorage()
    const storageKey = 'custom-session'
    const state = 'pending-oauth-state'
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    const previousKey = `${storageKey}-pkce-verifier-${state}`
    storage.setItem(previousKey, verifier)
    const client = createClient({
      url: 'https://api.test',
      publishableKey: 'nc_pk_test',
      storage,
      storageKey,
      fetch: api.fetch,
    })

    const result = await client.auth.oauth.exchangeCode(
      `${CALLBACK_URL}?code=nc_oc_code&nelcota_state=${state}`,
    )

    expect(result.kind).toBe('session')
    expect(api.callsTo('POST /auth/v1/oauth/token')[0]?.body).toEqual({
      code: 'nc_oc_code',
      code_verifier: verifier,
    })
    expect(storage.getItem(previousKey)).toBeNull()
  })

  it('accepts the verifier methods in the public OAuth constructor', async () => {
    const api = new FakeApi()
    api.reply('POST /auth/v1/oauth/token', { status: 200, body: sessionTokens() })
    const http = new HttpClient({
      url: 'https://api.test',
      publishableKey: 'nc_pk_test',
      fetch: api.fetch,
    })
    const manager = new SessionManager(http, new SessionStore(memoryStorage(), 'session'))
    const store = {
      saveVerifier: vi.fn(),
      takeVerifier: vi.fn(() => 'fixture-verifier'),
    }
    const oauth = new OAuthApi({ http, manager, store, now: Date.now })

    await oauth.exchangeCode(`${CALLBACK_URL}?code=nc_oc_code&nelcota_state=pending-state`)

    expect(store.takeVerifier).toHaveBeenCalledWith('pending-state')
  })

  it('throws the error the API sent back and forgets the verifier', async () => {
    const api = new FakeApi()
    const client = clientFor(api)
    const authorizeUrl = new URL(
      await client.auth.oauth.getAuthorizeUrl({ provider: 'google', redirectTo: CALLBACK_URL }),
    )
    const state = new URL(authorizeUrl.searchParams.get('redirect_to') ?? '').searchParams.get(
      'nelcota_state',
    )

    await expect(
      client.auth.oauth.exchangeCode(`${CALLBACK_URL}?error=access_denied&nelcota_state=${state}`),
    ).rejects.toMatchObject({ code: 'access_denied' })
    await expect(
      client.auth.oauth.exchangeCode(`${CALLBACK_URL}?code=nc_oc_code&nelcota_state=${state}`),
    ).rejects.toMatchObject({ code: 'missing_pkce_verifier' })
    expect(api.calls).toHaveLength(0)
  })

  it('refuses a callback URL without a code', async () => {
    const client = clientFor(new FakeApi())
    await client.auth.oauth.getAuthorizeUrl({ provider: 'google', redirectTo: CALLBACK_URL })

    await expect(client.auth.oauth.exchangeCode(CALLBACK_URL)).rejects.toMatchObject({
      code: 'missing_oauth_code',
    })
  })
})
