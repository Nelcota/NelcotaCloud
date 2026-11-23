import { AuthClient } from '../auth/auth-client'
import { SessionManager } from '../auth/session/session-manager'
import { defaultStorage } from '../auth/session/session-storage'
import type { SessionStorageAdapter } from '../auth/session/session-storage'
import { SessionStore } from '../auth/session/session-store'
import { DatabaseClient } from '../database/database-client'
import type { RelationQuery } from '../database/database-client'
import type {
  ArgsOf,
  FunctionName,
  GenericDatabase,
  RelationName,
  ReturnsOf,
} from '../database/database-types'
import type { QueryResult } from '../database/query-request'
import { HttpClient } from '../http/http-client'
import { StorageClient } from '../storage/storage-client'

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

export type NelcotaClient<Database extends GenericDatabase = GenericDatabase> = {
  auth: AuthClient
  /** The project's database: `from('posts').select('id, title').eq('published', true)`. */
  database: DatabaseClient<Database>
  /** Private file storage for the project. */
  storage: StorageClient
  /** Shortcut for `database.from`. */
  from<Name extends RelationName<Database>>(table: Name): RelationQuery<Database, Name>
  /** Shortcut for `database.rpc`. */
  rpc<Name extends FunctionName<Database>>(
    name: Name,
    args?: ArgsOf<Database, Name>,
  ): Promise<QueryResult<ReturnsOf<Database, Name>>>
  /** Releases browser event listeners and auth callbacks owned by this client. */
  dispose(): void
}

/**
 * The client of one project. `createClient<Database>(...)` with the generated `Database` type
 * (`nelcota gen types`) types table names, rows, inserts, updates and functions.
 */
export function createClient<Database extends GenericDatabase = GenericDatabase>(
  options: ClientOptions,
): NelcotaClient<Database> {
  if (options.publishableKey.startsWith('nc_sk_')) {
    throw new Error(
      'Never use the secret key in the SDK; it ships to every user. Use the publishable key.',
    )
  }

  const fetchFunction = options.fetch ?? globalThis.fetch.bind(globalThis)
  const http = new HttpClient({
    url: options.url,
    publishableKey: options.publishableKey,
    fetch: fetchFunction,
  })
  const store = new SessionStore(
    options.storage ?? defaultStorage(),
    options.storageKey ?? DEFAULT_STORAGE_KEY,
  )
  const now = options.now ?? Date.now
  const manager = new SessionManager(http, store, now)
  const database = new DatabaseClient<Database>(http, manager)

  return {
    auth: new AuthClient({ http, manager, store, now }),
    database,
    storage: new StorageClient(http, manager, fetchFunction),
    from: (table) => database.from(table),
    rpc: (name, args) => database.rpc(name, args),
    dispose: () => manager.dispose(),
  }
}
