import type { Session } from '../types'
import type { SessionStorageAdapter } from './session-storage'

const PKCE_SUFFIX = '-pkce-verifier'

/** Reads and writes the session and the pending OAuth verifier in the chosen storage. */
export class SessionStore {
  private readonly storage: SessionStorageAdapter
  private readonly key: string

  constructor(storage: SessionStorageAdapter, key: string) {
    this.storage = storage
    this.key = key
  }

  load(): Session | null {
    const raw = this.storage.getItem(this.key)

    if (raw === null) {
      return null
    }

    return parseStoredSession(raw)
  }

  save(session: Session): void {
    this.storage.setItem(this.key, JSON.stringify(session))
  }

  clear(): void {
    this.storage.removeItem(this.key)
  }

  /** Name shared by every tab using this storage key, for cross-tab locks. */
  lockName(): string {
    return `${this.key}-refresh`
  }

  takeVerifier(): string | null {
    const verifierKey = `${this.key}${PKCE_SUFFIX}`
    const verifier = this.storage.getItem(verifierKey)
    this.storage.removeItem(verifierKey)

    return verifier
  }

  saveVerifier(verifier: string): void {
    this.storage.setItem(`${this.key}${PKCE_SUFFIX}`, verifier)
  }
}

/** Storage can hold anything (old versions, other code), so the shape is checked before use. */
export function parseStoredSession(raw: string): Session | null {
  try {
    const value: unknown = JSON.parse(raw)

    if (isSession(value) === false) {
      return null
    }

    return value
  } catch {
    return null
  }
}

function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>
  const user = candidate.user as Record<string, unknown> | null | undefined

  return (
    typeof candidate.accessToken === 'string' &&
    typeof candidate.refreshToken === 'string' &&
    typeof candidate.expiresAt === 'number' &&
    Number.isFinite(candidate.expiresAt) &&
    typeof user === 'object' &&
    user !== null &&
    typeof user.id === 'string' &&
    typeof user.email === 'string'
  )
}
