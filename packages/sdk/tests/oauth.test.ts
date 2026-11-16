import { describe, expect, it } from 'vitest'

import { challengeFor } from '../src/auth/pkce'
import { createClient, memoryStorage } from '../src/index'
import { FakeApi, sessionTokens } from './fake-api'

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
        redirectTo: 'https://app.test/callback',
      }),
    )
    const result = await client.auth.oauth.exchangeCode({ code: 'nc_oc_code' })

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

    await expect(client.auth.oauth.exchangeCode({ code: 'nc_oc_code' })).rejects.toMatchObject({
      code: 'missing_pkce_verifier',
    })
  })
})
