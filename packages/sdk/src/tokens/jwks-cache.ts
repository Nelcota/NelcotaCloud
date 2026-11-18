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
  private keys = new Map<string, CryptoKey>()
  private loadedAt: number | null = null
  private loading: Promise<void> | null = null

  constructor(source: JwksSource) {
    this.source = source
  }

  async key(keyId: string): Promise<CryptoKey> {
    if (this.keys.has(keyId) === false && this.canRefresh()) {
      await this.refresh()
    }

    const key = this.keys.get(keyId)

    if (key === undefined) {
      throw new AccessTokenVerificationError(
        'unknown_key',
        'The token was signed by an unknown key.',
      )
    }

    return key
  }

  private canRefresh(): boolean {
    if (this.loadedAt === null) {
      return true
    }

    return this.source.now() - this.loadedAt >= MIN_REFRESH_INTERVAL_MS
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
    const imported = await Promise.allSettled(jwks.map(importKey))
    // A key the runtime cannot import is left out; tokens it signed fail as `unknown_key`.
    const usable = imported.flatMap((result) => fulfilledValue(result))
    this.keys = new Map(usable)
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

  return keys.filter(isEd25519Jwk)
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

async function importKey(jwk: PublicJwk): Promise<[string, CryptoKey]> {
  const publicJwk = { kty: jwk.kty, crv: jwk.crv, x: jwk.x }
  const key = await crypto.subtle.importKey('jwk', publicJwk, { name: 'Ed25519' }, false, [
    'verify',
  ])

  return [jwk.kid, key]
}

function fulfilledValue<T>(result: PromiseSettledResult<T>): T[] {
  if (result.status === 'rejected') {
    return []
  }

  return [result.value]
}

function unavailable(): AccessTokenVerificationError {
  return new AccessTokenVerificationError(
    'jwks_unavailable',
    'The project keys could not be loaded.',
  )
}
