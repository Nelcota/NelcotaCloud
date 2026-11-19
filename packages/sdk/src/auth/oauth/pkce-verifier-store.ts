import type { SessionStorageAdapter } from '../session/session-storage'

export class PkceVerifierStore {
  private readonly storage: SessionStorageAdapter
  private readonly keyPrefix: string

  constructor(storage: SessionStorageAdapter, storageKey: string) {
    this.storage = storage
    // A callback started by an earlier SDK version still uses this key.
    this.keyPrefix = `${storageKey}-pkce-verifier-`
  }

  saveVerifier(state: string, verifier: string): void {
    this.storage.setItem(`${this.keyPrefix}${state}`, verifier)
  }

  takeVerifier(state: string): string | null {
    const key = `${this.keyPrefix}${state}`
    const verifier = this.storage.getItem(key)
    this.storage.removeItem(key)

    return verifier
  }
}
