const VERIFIER_BYTES = 32

/** A PKCE pair (RFC 7636): the verifier stays with the app, the challenge goes to the server. */
export type PkcePair = {
  verifier: string
  challenge: string
}

export async function createPkcePair(): Promise<PkcePair> {
  const random = new Uint8Array(VERIFIER_BYTES)
  globalThis.crypto.getRandomValues(random)
  const verifier = toBase64Url(random)

  return { verifier, challenge: await challengeFor(verifier) }
}

export function createOAuthState(): string {
  const random = new Uint8Array(VERIFIER_BYTES)
  globalThis.crypto.getRandomValues(random)

  return toBase64Url(random)
}

/** S256: base64url(SHA-256(verifier)). */
export async function challengeFor(verifier: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  )

  return toBase64Url(new Uint8Array(digest))
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return globalThis.btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}
