import type { HttpMethod } from '../http/http-client'

/** Everything a Data API request carries; builders add to it, then it is sent once. */
export type QueryRequest = {
  method: HttpMethod
  /** Path after `/rest/v1`, e.g. `/posts` or `/rpc/add`. */
  path: string
  /** Query parameters in order (`select`, filters, `order`, `limit`…), not yet encoded. */
  params: [string, string][]
  /** `Prefer` tokens, e.g. `return=representation`, `count=exact`. */
  prefer: string[]
  /** Answer a single object instead of an array. */
  single: boolean
  body?: unknown
}

/** What a query resolves to: the rows (or object) and, when counted, the total. */
export type QueryResult<T> = {
  data: T
  /** Rows matching the filters, with `count: 'exact' | 'planned'`; `null` otherwise. */
  count: number | null
}

/** The PostgREST media type that asks for one object instead of an array. */
export const SINGLE_OBJECT_MEDIA_TYPE = 'application/vnd.pgrst.object+json'

export function newRequest(method: HttpMethod, path: string): QueryRequest {
  return { method, path, params: [], prefer: [], single: false }
}

/** `?select=id&age=gte.18`, each part percent-encoded. */
export function queryString(params: [string, string][]): string {
  if (params.length === 0) {
    return ''
  }

  const encoded = params.map(
    ([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
  )

  return `?${encoded.join('&')}`
}

/** The total of a `Content-Range` header (`0-24/3573`); `null` when absent or `*`. */
export function countFromContentRange(header: string | null): number | null {
  const total = header?.split('/')[1]

  if (total === undefined || total === '*') {
    return null
  }

  const count = Number(total)

  if (Number.isInteger(count) === false || count < 0) {
    return null
  }

  return count
}
