import type { Session } from '../auth-types'
import type { SessionStorageAdapter } from './session-storage'
import { isRecord, isUser } from '../user-shape'

/** Reads and writes the session in the chosen storage. */
export class SessionStore {
  readonly storage: SessionStorageAdapter
  readonly key: string

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

  /** Calls `listener` when another tab of the origin changes the stored session (browsers only). */
  watchOtherTabs(listener: (stored: Session | null) => void): (() => void) | null {
    if (typeof globalThis.addEventListener !== 'function') {
      return null
    }

    const onStorage = (event: StorageEvent): void => {
      if (event.storageArea !== this.storage) {
        return
      }

      // A null key means the whole storage was cleared.
      if (event.key !== this.key && event.key !== null) {
        return
      }

      listener(this.load())
    }
    globalThis.addEventListener('storage', onStorage)

    return () => globalThis.removeEventListener('storage', onStorage)
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
  if (isRecord(value) === false) {
    return false
  }

  return (
    typeof value.accessToken === 'string' &&
    typeof value.refreshToken === 'string' &&
    typeof value.expiresAt === 'number' &&
    Number.isFinite(value.expiresAt) &&
    isUser(value.user)
  )
}
