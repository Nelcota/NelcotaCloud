import { NelcotaError } from './nelcota-error'

const API_KEY_HEADER = 'apikey'
const REQUEST_ID_HEADER = 'x-request-id'
const UNKNOWN_ERROR_CODE = 'unknown_error'
const FILE_CONTENT_TYPE = 'application/octet-stream'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type HttpRequest = {
  method: HttpMethod
  path: string
  body?: unknown
  /** Sent as is (`application/octet-stream`) instead of a JSON `body`. */
  file?: Blob
  accessToken?: string
  /** Extra headers (`prefer`, `accept`); never the API key or the authorization. */
  headers?: Record<string, string>
}

/** A response body with the headers it came with. */
export type HttpResponse<T> = {
  data: T
  headers: Headers
}

export type HttpClientOptions = {
  url: string
  publishableKey: string
  fetch: typeof fetch
}

/** Sends JSON requests with the tenant's publishable key and turns API errors into `NelcotaError`. */
export class HttpClient {
  readonly baseUrl: string
  readonly publishableKey: string
  private readonly fetchFunction: typeof fetch

  constructor(options: HttpClientOptions) {
    this.baseUrl = withoutTrailingSlashes(options.url)
    this.publishableKey = options.publishableKey
    this.fetchFunction = options.fetch
  }

  async request<T>(request: HttpRequest): Promise<T> {
    const response = await this.send<T>(request)

    return response.data
  }

  async send<T>(request: HttpRequest): Promise<HttpResponse<T>> {
    const response = await this.fetchFunction(`${this.baseUrl}${request.path}`, {
      method: request.method,
      headers: this.headersFor(request),
      body: bodyOf(request),
    })

    if (response.ok === false) {
      throw await toNelcotaError(response)
    }

    // 204 and 202 (e.g. "a link is on its way") carry no body.
    const text = await response.text()

    if (text === '') {
      return { data: undefined as T, headers: response.headers }
    }

    return { data: JSON.parse(text) as T, headers: response.headers }
  }

  private headersFor(request: HttpRequest): Record<string, string> {
    const headers: Record<string, string> = {
      ...request.headers,
      [API_KEY_HEADER]: this.publishableKey,
    }

    if (request.file !== undefined) {
      headers['content-type'] = FILE_CONTENT_TYPE
    }

    if (request.body !== undefined) {
      headers['content-type'] = 'application/json'
    }

    if (request.accessToken !== undefined) {
      headers.authorization = `Bearer ${request.accessToken}`
    }

    return headers
  }
}

/**
 * `https://api.test///` becomes `https://api.test`. A loop instead of `/\/+$/`, whose
 * backtracking grows with the number of slashes in a URL the app passes in.
 */
export function withoutTrailingSlashes(url: string): string {
  let end = url.length

  while (end > 0 && url.charAt(end - 1) === '/') {
    end -= 1
  }

  return url.slice(0, end)
}

function bodyOf(request: HttpRequest): Blob | string | undefined {
  if (request.file !== undefined) {
    return request.file
  }

  if (request.body === undefined) {
    return undefined
  }

  return JSON.stringify(request.body)
}

async function toNelcotaError(response: Response): Promise<NelcotaError> {
  const requestId = response.headers.get(REQUEST_ID_HEADER)
  const payload: unknown = await response.json().catch(() => null)
  const fallback = {
    status: response.status,
    code: UNKNOWN_ERROR_CODE,
    message: response.statusText,
    requestId,
  }

  if (isErrorPayload(payload) === false) {
    return new NelcotaError(fallback)
  }

  return new NelcotaError({ ...fallback, code: payload.error, message: payload.message })
}

function isErrorPayload(payload: unknown): payload is { error: string; message: string } {
  if (typeof payload !== 'object' || payload === null) {
    return false
  }

  return (
    'error' in payload &&
    typeof payload.error === 'string' &&
    'message' in payload &&
    typeof payload.message === 'string'
  )
}
