import { WebhookVerificationError } from './webhook-verification-error'

const SECRET_PREFIX = 'whsec_'
const SIGNATURE_VERSION = 'v1,'

/** The secret's key bytes (`whsec_<base64>`, as the console shows it). */
export function secretKey(secret: string): Uint8Array<ArrayBuffer> {
  const key = decodeBase64(withoutPrefix(secret))

  // An empty key would make WebCrypto throw its own DataError.
  if (key.length === 0) {
    throw new WebhookVerificationError('invalid_secret', 'The webhook secret is empty.')
  }

  return key
}

function decodeBase64(encoded: string): Uint8Array<ArrayBuffer> {
  try {
    return Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0))
  } catch {
    throw new WebhookVerificationError('invalid_secret', 'The webhook secret is not valid base64.')
  }
}

function withoutPrefix(secret: string): string {
  if (secret.startsWith(SECRET_PREFIX)) {
    return secret.slice(SECRET_PREFIX.length)
  }

  return secret
}

/** `v1,<base64 HMAC-SHA256 of "id.timestamp.body">`, as Standard Webhooks defines it. */
export async function expectedSignature(
  key: Uint8Array<ArrayBuffer>,
  signedContent: string,
): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const digest = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(signedContent),
  )
  const binary = String.fromCharCode(...new Uint8Array(digest))

  return `${SIGNATURE_VERSION}${btoa(binary)}`
}

/** The header lists one signature per active secret (two during a rotation). */
export function hasMatchingSignature(header: string, expected: string): boolean {
  return header.split(' ').some((signature) => constantTimeEquals(signature, expected))
}

/** Compares without stopping at the first difference, so timing does not leak the signature. */
function constantTimeEquals(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false
  }

  let difference = 0

  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }

  return difference === 0
}
