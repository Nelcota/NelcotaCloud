import { AuthClient } from '../auth/auth-client'
import { SessionManager } from '../auth/session-manager'
import { defaultStorage } from '../auth/session-storage'
import type { SessionStorageAdapter } from '../auth/session-storage'
import { SessionStore } from '../auth/session-store'
import { HttpClient } from '../http/http-client'

const DEFAULT_STORAGE_KEY = 'nelcota-session'

export type ClientOptions = {
  /** Address of the NelcotaCloud API, e.g. `https://api.example.com`. */
  url: string
  /** The project's publishable key (`nc_pk_…`); safe to ship in apps. Never the secret key. */
  publishableKey: string
  /** Where the session survives reloads; `localStorage` in browsers, memory elsewhere. */
  storage?: SessionStorageAdapter
  /** Storage key, to keep sessions of several projects apart on one origin. */
  storageKey?: string
  /** A custom `fetch` (tests, server runtimes). */
  fetch?: typeof fetch
  /** A custom clock (tests, deterministic session expiry). */
  now?: () => number
}

export type NelcotaClient = {
  auth: AuthClient
  /** Releases browser event listeners and auth callbacks owned by this client. */
  dispose(): void
}

export function createClient(options: ClientOptions): NelcotaClient {
  if (options.publishableKey.startsWith('nc_sk_')) {
    throw new Error(
      'Never use the secret key in the SDK; it ships to every user. Use the publishable key.',
    )
  }

  const http = new HttpClient({
    url: options.url,
    publishableKey: options.publishableKey,
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
  })
  const store = new SessionStore(
    options.storage ?? defaultStorage(),
    options.storageKey ?? DEFAULT_STORAGE_KEY,
  )
  const now = options.now ?? Date.now
  const manager = new SessionManager(http, store, now)

  return {
    auth: new AuthClient({ http, manager, store, now }),
    dispose: () => manager.dispose(),
  }
}
