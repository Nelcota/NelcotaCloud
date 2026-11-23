import type { SessionStorageAdapter } from '../session/session-storage'

// The server permits ten minutes to authorize and two more to redeem its code.
const VERIFIER_LIFETIME = 12 * 60 * 1_000
type StoredVerifier = { verifier: string; expiresAt: number }

export class PkceVerifierStore {
  private readonly storage: SessionStorageAdapter
  private readonly now: () => number
  private readonly prefix: string
  private readonly indexKey: string
  private readonly legacyDeadlineKey: string

  constructor(storage: SessionStorageAdapter, storageKey: string, now: () => number = Date.now) {
    this.storage = storage
    this.now = now
    this.prefix = `${storageKey}-pkce-verifier-`
    this.indexKey = `${storageKey}-pkce-index`
    this.legacyDeadlineKey = `${storageKey}-pkce-legacy-deadline`
  }

  saveVerifier(state: string, verifier: string): void {
    const keys = this.prune()
    const key = this.prefix + state
    const entry: StoredVerifier = { verifier, expiresAt: this.now() + VERIFIER_LIFETIME }
    this.storage.setItem(key, JSON.stringify(entry))

    if (this.usesIndex && keys.includes(key) === false) {
      this.writeIndex([...keys, key])
    }
  }

  peekVerifier(state: string): string | null {
    this.prune()

    return this.read(this.prefix + state)
  }

  takeVerifier(state: string): string | null {
    const verifier = this.peekVerifier(state)
    this.storage.removeItem(this.prefix + state)

    return verifier
  }

  private get usesIndex(): boolean {
    return this.storage.key === undefined || this.storage.length === undefined
  }

  private prune(): string[] {
    if (this.storage.getItem(this.legacyDeadlineKey) === null) {
      this.storage.setItem(this.legacyDeadlineKey, String(this.now() + VERIFIER_LIFETIME))
    }

    const keys = this.keys().filter((key) => this.read(key) !== null)

    if (this.usesIndex) {
      this.writeIndex(keys)
    }

    return keys
  }

  private keys(): string[] {
    if (this.usesIndex) {
      const index = parseJson(this.storage.getItem(this.indexKey))
      return Array.isArray(index)
        ? index.filter(
            (key): key is string => typeof key === 'string' && key.startsWith(this.prefix),
          )
        : []
    }

    const keys: string[] = []

    for (let index = 0; index < (this.storage.length ?? 0); index += 1) {
      const key = this.storage.key?.(index)

      if (key?.startsWith(this.prefix)) {
        keys.push(key)
      }
    }

    return keys
  }

  private writeIndex(keys: string[]): void {
    if (keys.length === 0) {
      this.storage.removeItem(this.indexKey)
      return
    }

    this.storage.setItem(this.indexKey, JSON.stringify(keys))
  }

  private read(key: string): string | null {
    const raw = this.storage.getItem(key)

    if (raw === null) {
      return null
    }

    const entry = parseJson(raw)

    if (isStoredVerifier(entry) && entry.expiresAt > this.now()) {
      return entry.verifier
    }

    // Raw verifiers written by the previous SDK can finish during the upgrade window.
    if (
      /^[A-Za-z0-9._~-]{43,128}$/.test(raw) &&
      Number(this.storage.getItem(this.legacyDeadlineKey)) > this.now()
    ) {
      return raw
    }

    this.storage.removeItem(key)

    return null
  }
}

function parseJson(raw: string | null): unknown {
  try {
    return raw === null ? undefined : JSON.parse(raw)
  } catch {
    return undefined
  }
}

function isStoredVerifier(value: unknown): value is StoredVerifier {
  return (
    typeof value === 'object' &&
    value !== null &&
    'verifier' in value &&
    typeof value.verifier === 'string' &&
    'expiresAt' in value &&
    typeof value.expiresAt === 'number'
  )
}
