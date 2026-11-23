import type { components, paths } from '../generated/api-schema'
import { withoutTrailingSlashes } from '../http/base-url'
import { toNelcotaError } from '../http/response-error'

const REQUEST_TIMEOUT_MS = 1_500
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]']

type CacheWriteRequest = components['schemas']['CacheWriteRequest']
type CacheKeyRequest = components['schemas']['CacheKeyRequest']
type CachePath = Extract<keyof paths, `/cache/v1/${string}`>

export type CacheValue =
  | string
  | number
  | boolean
  | null
  | readonly CacheValue[]
  | { readonly [key: string]: CacheValue }

export type CacheHit = { value: CacheValue }

export type CacheClientOptions = {
  url: string
  /** A cache credential issued in the console. Keep it on the application server. */
  token: string
  fetch?: typeof fetch
}

/** Project cache over HTTPS. Instantiate this client only on the application server. */
export class CacheClient {
  private readonly baseUrl: string
  private readonly token: string
  private readonly fetchFunction: typeof fetch

  constructor(options: CacheClientOptions) {
    if (typeof window !== 'undefined') {
      throw new Error('Project cache credentials can only be used on a server.')
    }

    if (options.token.startsWith('nc_cache_') === false) {
      throw new Error('A project cache credential is required.')
    }

    this.baseUrl = cacheBaseUrl(options.url)
    this.token = options.token
    this.fetchFunction = options.fetch ?? globalThis.fetch.bind(globalThis)
  }

  /** Returns null on a miss. A cached JSON null is returned as `{ value: null }`. */
  async get(key: string): Promise<CacheHit | null> {
    const response = await this.send('/cache/v1/get', { key })

    if (response.ok) {
      return readHit(response)
    }

    const error = await toNelcotaError(response)
    if (error.status === 404 && error.code === 'cache_miss') {
      return null
    }

    throw error
  }

  async set(key: string, value: CacheValue, ttlSeconds?: number): Promise<void> {
    const body: CacheWriteRequest = { key, value, ttl_seconds: ttlSeconds ?? null }
    const response = await this.send('/cache/v1/set', body)
    await ensureSuccess(response)
  }

  async delete(key: string): Promise<void> {
    const response = await this.send('/cache/v1/delete', { key })
    await ensureSuccess(response)
  }

  private send(path: CachePath, body: CacheKeyRequest | CacheWriteRequest): Promise<Response> {
    return this.fetchFunction(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body, rejectNonFiniteNumber),
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  }
}

function rejectNonFiniteNumber(_key: string, value: unknown): unknown {
  if (typeof value === 'number' && Number.isFinite(value) === false) {
    throw new TypeError('Cache requests must contain only finite numbers.')
  }

  return value
}

export function createCacheClient(options: CacheClientOptions): CacheClient {
  return new CacheClient(options)
}

async function ensureSuccess(response: Response): Promise<void> {
  if (response.ok === false) {
    throw await toNelcotaError(response)
  }
}

async function readHit(response: Response): Promise<CacheHit> {
  const entry: unknown = await response.json()

  if (entry === null || typeof entry !== 'object' || Object.hasOwn(entry, 'value') === false) {
    throw new Error('The API returned an invalid cache entry.')
  }

  return entry as CacheHit
}

function cacheBaseUrl(input: string): string {
  const url = new URL(input)
  const protocol = url.protocol

  if (
    protocol !== 'https:' &&
    (protocol !== 'http:' || LOCAL_HOSTS.includes(url.hostname) === false)
  ) {
    throw new Error('Project cache requires HTTPS outside localhost.')
  }

  if (url.username !== '' || url.password !== '' || url.search !== '' || url.hash !== '') {
    throw new Error('Project cache requires an API URL without credentials, query, or fragment.')
  }

  return withoutTrailingSlashes(`${url.origin}${url.pathname}`)
}
