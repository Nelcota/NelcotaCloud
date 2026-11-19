import { createLocalJWKSet, type FlattenedJWSInput, type JWSHeaderParameters } from 'jose'

import { AccessTokenVerificationError } from './access-token-verification-error'

/** A forged `kid` must not make every request download the keys again. */
const MIN_REFRESH_INTERVAL_MS = 60_000

type PublicJwk = { kid: string; kty: string; crv: string; x: string }

export type JwksSource = {
  /** `{url}/auth/v1/jwks`. */
  jwksUrl: string
  publishableKey: string
  fetch: typeof fetch
  now: () => number
}

/**
 * The project's public keys, loaded once and again only when a token names an unknown key
 * (after a rotation), at most once a minute.
 */
export class JwksCache {
  private readonly source: JwksSource
  private resolve = createLocalJWKSet({ keys: [] })
  private loadedAt: number | null = null
  private loading: Promise<void> | null = null

  constructor(source: JwksSource) {
    this.source = source
  }

  async key(header: JWSHeaderParameters, signature: FlattenedJWSInput): Promise<CryptoKey> {
    if (this.loadedAt === null) {
      await this.refresh()
    }

    const key = await this.resolve(header, signature).catch(() => null)

    if (key !== null) {
      return key
    }

    if (this.loadedAt !== null && this.source.now() - this.loadedAt >= MIN_REFRESH_INTERVAL_MS) {
      await this.refresh()
      return this.resolve(header, signature).catch(() => {
        throw unknownKey()
      })
    }

    throw unknownKey()
  }

  /** Concurrent misses share one download. */
  private refresh(): Promise<void> {
    if (this.loading === null) {
      this.loading = this.download().finally(() => {
        this.loading = null
      })
    }

    return this.loading
  }

  private async download(): Promise<void> {
    const jwks = await this.fetchJwks()
    this.resolve = createLocalJWKSet({ keys: jwks })
    this.loadedAt = this.source.now()
  }

  private async fetchJwks(): Promise<PublicJwk[]> {
    const headers = { apikey: this.source.publishableKey }
    const response = await this.source.fetch(this.source.jwksUrl, { headers }).catch(() => null)

    if (response === null || response.ok === false) {
      throw unavailable()
    }

    const body: unknown = await response.json().catch(() => null)

    return publicKeysOf(body)
  }
}

function publicKeysOf(body: unknown): PublicJwk[] {
  if (typeof body !== 'object' || body === null) {
    throw unavailable()
  }

  const keys = (body as { keys?: unknown }).keys

  if (Array.isArray(keys) === false) {
    throw unavailable()
  }

  return keys.filter(isEd25519Jwk).map(({ kid, kty, crv, x }) => ({ kid, kty, crv, x }))
}

function isEd25519Jwk(value: unknown): value is PublicJwk {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const jwk = value as Record<string, unknown>

  return (
    typeof jwk.kid === 'string' &&
    jwk.kty === 'OKP' &&
    jwk.crv === 'Ed25519' &&
    typeof jwk.x === 'string'
  )
}

function unavailable(): AccessTokenVerificationError {
  return new AccessTokenVerificationError(
    'jwks_unavailable',
    'The project keys could not be loaded.',
  )
}

function unknownKey(): AccessTokenVerificationError {
  return new AccessTokenVerificationError('unknown_key', 'The token was signed by an unknown key.')
}
