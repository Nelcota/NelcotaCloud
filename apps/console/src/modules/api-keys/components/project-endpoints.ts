import { API_BASE_URL } from '@/shared/api/api-base-url'

/** Public keys that verify the project's access tokens; requests send the publishable key. */
export const JWKS_URL = `${API_BASE_URL}/auth/v1/jwks`

/** The `iss` claim of every access token; `aud` is the project id. */
export const TOKEN_ISSUER = `${API_BASE_URL}/auth/v1`

/** Access tokens are signed with Ed25519 keys, named EdDSA in the JWT header. */
export const SIGNING_ALGORITHM = 'EdDSA'

/** Placeholder for snippets when no publishable key can be shown in full. */
export const PUBLISHABLE_PLACEHOLDER = 'SUA_PUBLISHABLE_KEY'
