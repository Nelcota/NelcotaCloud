import { AuthClient } from '../auth/auth-client'
import { SessionManager } from '../auth/session-manager'
import { defaultStorage } from '../auth/session-storage'
import type { SessionStorageAdapter } from '../auth/session-storage'
import { SessionStore } from '../auth/session-store'
import { DatabaseClient } from '../database/database-client'
import type { TableQuery } from '../database/table-query'
import type { QueryResult } from '../database/query-request'
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
  /** The project's database: `from('posts').select('id, title').eq('published', true)`. */
  database: DatabaseClient
  /** Shortcut for `database.from`. */
  from<Row extends Record<string, unknown> = Record<string, unknown>>(
    table: string,
  ): TableQuery<Row>
  /** Shortcut for `database.rpc`. */
  rpc<T = unknown>(name: string, args?: Record<string, unknown>): Promise<QueryResult<T>>
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
  const database = new DatabaseClient(http, manager)

  return {
    auth: new AuthClient({ http, manager, store, now }),
    database,
    from: (table) => database.from(table),
    rpc: (name, args) => database.rpc(name, args),
    dispose: () => manager.dispose(),
  }
}
