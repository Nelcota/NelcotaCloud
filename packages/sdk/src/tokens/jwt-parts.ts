import { AccessTokenVerificationError } from './access-token-verification-error'

/** A compact JWT split into what verification needs, before anything is trusted. */
export type JwtParts = {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signedContent: Uint8Array<ArrayBuffer>
  signature: Uint8Array<ArrayBuffer>
}

export function splitJwt(token: string): JwtParts {
  const parts = token.split('.')

  if (parts.length !== 3) {
    throw malformed()
  }

  const [header = '', payload = '', signature = ''] = parts

  return {
    header: decodeJsonPart(header),
    payload: decodeJsonPart(payload),
    signedContent: new TextEncoder().encode(`${header}.${payload}`),
    signature: decodeBase64Url(signature),
  }
}

export function decodeBase64Url(encoded: string): Uint8Array<ArrayBuffer> {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')

  try {
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
  } catch {
    throw malformed()
  }
}

function decodeJsonPart(encoded: string): Record<string, unknown> {
  const text = new TextDecoder().decode(decodeBase64Url(encoded))
  const parsed = parseJson(text)

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw malformed()
  }

  return parsed as Record<string, unknown>
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    throw malformed()
  }
}

function malformed(): AccessTokenVerificationError {
  return new AccessTokenVerificationError('malformed', 'The access token is not a JWT.')
}
