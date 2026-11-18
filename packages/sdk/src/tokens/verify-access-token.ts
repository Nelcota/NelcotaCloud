import { AccessTokenVerificationError } from './access-token-verification-error'
import { JwksCache } from './jwks-cache'
import { type JwtParts, splitJwt } from './jwt-parts'

/** Tolerated clock difference with the API, the same the API itself allows. */
const LEEWAY_SECONDS = 30
const MILLISECONDS_PER_SECOND = 1000

/** What a valid access token says about its user. */
export type AccessTokenClaims = {
  /** The user's id. */
  sub: string
  email: string
  /** The session (refresh token family) the token belongs to. */
  sid: string
  /** Set by the project's admins (roles, plans); empty when nothing was set. */
  app_metadata: Record<string, unknown>
  /** The project id. */
  aud: string
  iss: string
  iat: number
  exp: number
}

export type AccessTokenVerifierOptions = {
  /** The API address, the same `url` given to `createClient`. */
  url: string
  publishableKey: string
  /** The project id shown in the console; tokens of other projects are refused. */
  projectId: string
  fetch?: typeof fetch
  /** A custom clock (tests). */
  now?: () => number
}

export type AccessTokenVerifier = (accessToken: string) => Promise<AccessTokenClaims>

/**
 * For your server: checks an access token's signature with the project's public keys (JWKS,
 * cached), its project, issuer and expiry, then returns its claims. Throws
 * `AccessTokenVerificationError` otherwise. Create one verifier and reuse it.
 *
 * The token stays valid until it expires (15 minutes) even if the session ends sooner.
 */
export function createAccessTokenVerifier(
  options: AccessTokenVerifierOptions,
): AccessTokenVerifier {
  const issuer = `${options.url.replace(/\/+$/, '')}/auth/v1`
  const now = options.now ?? Date.now
  const keys = new JwksCache({
    jwksUrl: `${issuer}/jwks`,
    publishableKey: options.publishableKey,
    fetch: options.fetch ?? fetch,
    now,
  })

  return async (accessToken) => {
    const parts = splitJwt(accessToken)
    await checkSignature(parts, keys)

    return checkClaims(parts.payload, { issuer, projectId: options.projectId, now })
  }
}

async function checkSignature(parts: JwtParts, keys: JwksCache): Promise<void> {
  const { alg, kid } = parts.header

  if (alg !== 'EdDSA' || typeof kid !== 'string') {
    throw new AccessTokenVerificationError(
      'malformed',
      'The token is not an EdDSA JWT with a key id.',
    )
  }

  const key = await keys.key(kid)

  if (
    (await crypto.subtle.verify('Ed25519', key, parts.signature, parts.signedContent)) === false
  ) {
    throw new AccessTokenVerificationError(
      'invalid_signature',
      'The token signature does not match.',
    )
  }
}

type ClaimRules = { issuer: string; projectId: string; now: () => number }

function checkClaims(payload: Record<string, unknown>, rules: ClaimRules): AccessTokenClaims {
  if (isClaims(payload) === false) {
    throw new AccessTokenVerificationError('malformed', 'The token is missing claims.')
  }

  if (payload.aud !== rules.projectId) {
    throw new AccessTokenVerificationError('wrong_audience', 'The token is for another project.')
  }

  if (payload.iss !== rules.issuer) {
    throw new AccessTokenVerificationError('wrong_issuer', 'The token comes from another API.')
  }

  if (rules.now() / MILLISECONDS_PER_SECOND > payload.exp + LEEWAY_SECONDS) {
    throw new AccessTokenVerificationError('expired', 'The token has expired.')
  }

  return { ...payload, app_metadata: payload.app_metadata ?? {} }
}

type RawClaims = Omit<AccessTokenClaims, 'app_metadata'> & {
  app_metadata?: Record<string, unknown>
}

function isClaims(payload: Record<string, unknown>): payload is RawClaims {
  const metadata = payload.app_metadata

  return (
    typeof payload.sub === 'string' &&
    typeof payload.email === 'string' &&
    typeof payload.sid === 'string' &&
    typeof payload.aud === 'string' &&
    typeof payload.iss === 'string' &&
    typeof payload.iat === 'number' &&
    typeof payload.exp === 'number' &&
    (metadata === undefined || (typeof metadata === 'object' && metadata !== null))
  )
}
