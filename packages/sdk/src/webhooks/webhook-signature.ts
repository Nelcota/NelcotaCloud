import { WebhookVerificationError } from './webhook-verification-error'

const SECRET_PREFIX = 'whsec_'
const SIGNATURE_VERSION = 'v1,'
const SHA256_SIGNATURE_BYTES = 32

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

/** Verifies raw signatures for callers that set their own clock or tolerance. */
export async function matchesRawSignature(
  key: Uint8Array<ArrayBuffer>,
  signedContent: string,
  header: string,
): Promise<boolean> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const content = new TextEncoder().encode(signedContent)
  for (const encoded of header.split(' ')) {
    const signature = signatureBytes(encoded)

    if (signature !== null && (await crypto.subtle.verify('HMAC', cryptoKey, signature, content))) {
      return true
    }
  }

  return false
}

function signatureBytes(value: string): Uint8Array<ArrayBuffer> | null {
  if (value.startsWith(SIGNATURE_VERSION) === false) {
    return null
  }

  const encoded = value.slice(SIGNATURE_VERSION.length)
  try {
    const binary = atob(encoded)

    if (binary.length !== SHA256_SIGNATURE_BYTES || btoa(binary) !== encoded) {
      return null
    }

    return Uint8Array.from(binary, (character) => character.charCodeAt(0))
  } catch {
    return null
  }
}
