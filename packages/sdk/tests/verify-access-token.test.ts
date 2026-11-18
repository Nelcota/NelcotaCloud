import { describe, expect, it } from 'vitest'

import { createAccessTokenVerifier } from '../src/index'
import type { AccessTokenVerifier } from '../src/index'

const API_URL = 'https://api.test/'
const ISSUER = 'https://api.test/auth/v1'
const PROJECT_ID = '9c2791c2-6e42-45dd-aafd-729da8a48e78'
const NOW_SECONDS = 1_800_000_000

type SigningKey = { kid: string; privateKey: CryptoKey; publicJwk: JsonWebKey }

async function signingKey(kid: string): Promise<SigningKey> {
  const pair = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair
  const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey)

  return { kid, privateKey: pair.privateKey, publicJwk }
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function encodeJson(value: object): string {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)))
}

function claims(overrides: object = {}): object {
  return {
    sub: 'user-1',
    email: 'ana@example.com',
    sid: 'session-1',
    aud: PROJECT_ID,
    iss: ISSUER,
    iat: NOW_SECONDS - 60,
    exp: NOW_SECONDS + 840,
    app_metadata: { role: 'editor' },
    ...overrides,
  }
}

async function signToken(key: SigningKey, payload: object): Promise<string> {
  const header = encodeJson({ alg: 'EdDSA', typ: 'JWT', kid: key.kid })
  const body = encodeJson(payload)
  const content = new TextEncoder().encode(`${header}.${body}`)
  const signature = await crypto.subtle.sign('Ed25519', key.privateKey, content)

  return `${header}.${body}.${base64Url(new Uint8Array(signature))}`
}

/** Serves the JWKS of the keys it holds and counts the downloads. */
class FakeJwks {
  keys: SigningKey[]
  downloads = 0

  constructor(keys: SigningKey[]) {
    this.keys = keys
  }

  fetch: typeof fetch = async (input, init) => {
    this.downloads += 1
    expect(String(input)).toBe(`${ISSUER}/jwks`)
    expect(new Headers(init?.headers).get('apikey')).toBe('nc_pk_test')
    const keys = this.keys.map((key) => ({ ...key.publicJwk, kid: key.kid, alg: 'EdDSA' }))

    return new Response(JSON.stringify({ keys }), { status: 200 })
  }
}

function verifierFor(jwks: FakeJwks, clock = { now: NOW_SECONDS * 1000 }): AccessTokenVerifier {
  return createAccessTokenVerifier({
    url: API_URL,
    publishableKey: 'nc_pk_test',
    projectId: PROJECT_ID,
    fetch: jwks.fetch,
    now: () => clock.now,
  })
}

describe('createAccessTokenVerifier', () => {
  it('returns the claims of a valid token and caches the keys', async () => {
    const key = await signingKey('key-1')
    const jwks = new FakeJwks([key])
    const verify = verifierFor(jwks)

    const first = await verify(await signToken(key, claims()))
    await verify(await signToken(key, claims({ sub: 'user-2' })))

    expect(first.sub).toBe('user-1')
    expect(first.app_metadata).toEqual({ role: 'editor' })
    expect(jwks.downloads).toBe(1)
  })

  it('treats a token without app_metadata as having none', async () => {
    const key = await signingKey('key-1')
    const verify = verifierFor(new FakeJwks([key]))

    const verified = await verify(await signToken(key, claims({ app_metadata: undefined })))

    expect(verified.app_metadata).toEqual({})
  })

  it('downloads the keys again after a rotation, at most once a minute', async () => {
    const oldKey = await signingKey('key-1')
    const newKey = await signingKey('key-2')
    const jwks = new FakeJwks([oldKey])
    const clock = { now: NOW_SECONDS * 1000 }
    const verify = verifierFor(jwks, clock)
    await verify(await signToken(oldKey, claims()))
    jwks.keys = [oldKey, newKey]

    await expect(verify(await signToken(newKey, claims()))).rejects.toMatchObject({
      code: 'unknown_key',
    })
    clock.now += 61_000
    const verified = await verify(await signToken(newKey, claims({ exp: NOW_SECONDS + 900 })))

    expect(verified.sub).toBe('user-1')
    expect(jwks.downloads).toBe(2)
  })

  it.each([
    ['wrong_audience', { aud: 'another-project' }],
    ['wrong_issuer', { iss: 'https://evil.test/auth/v1' }],
    ['expired', { exp: NOW_SECONDS - 31 }],
    ['malformed', { sid: undefined }],
  ])('refuses a token with %s claims', async (code, overrides) => {
    const key = await signingKey('key-1')
    const verify = verifierFor(new FakeJwks([key]))

    await expect(verify(await signToken(key, claims(overrides)))).rejects.toMatchObject({ code })
  })

  it('refuses a token signed by another key with the same id', async () => {
    const key = await signingKey('key-1')
    const forger = await signingKey('key-1')
    const verify = verifierFor(new FakeJwks([key]))

    await expect(verify(await signToken(forger, claims()))).rejects.toMatchObject({
      code: 'invalid_signature',
    })
  })

  it('refuses tokens that are not EdDSA JWTs', async () => {
    const key = await signingKey('key-1')
    const verify = verifierFor(new FakeJwks([key]))
    const token = await signToken(key, claims())
    const [, body, signature] = token.split('.')
    const noneHeader = encodeJson({ alg: 'none', kid: 'key-1' })

    await expect(verify('not-a-jwt')).rejects.toMatchObject({ code: 'malformed' })
    await expect(verify(`${noneHeader}.${body}.${signature}`)).rejects.toMatchObject({
      code: 'malformed',
    })
  })

  it('reports keys it cannot load', async () => {
    const key = await signingKey('key-1')
    const verify = createAccessTokenVerifier({
      url: API_URL,
      publishableKey: 'nc_pk_test',
      projectId: PROJECT_ID,
      fetch: async () => new Response('down', { status: 503 }),
      now: () => NOW_SECONDS * 1000,
    })

    await expect(verify(await signToken(key, claims()))).rejects.toMatchObject({
      code: 'jwks_unavailable',
    })
  })
})
