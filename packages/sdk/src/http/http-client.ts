import { NelcotaError } from './nelcota-error'

const API_KEY_HEADER = 'apikey'
const REQUEST_ID_HEADER = 'x-request-id'
const UNKNOWN_ERROR_CODE = 'unknown_error'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type HttpRequest = {
  method: HttpMethod
  path: string
  body?: unknown
  accessToken?: string
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
    this.baseUrl = options.url.replace(/\/+$/, '')
    this.publishableKey = options.publishableKey
    this.fetchFunction = options.fetch
  }

  async request<T>(request: HttpRequest): Promise<T> {
    const response = await this.fetchFunction(`${this.baseUrl}${request.path}`, {
      method: request.method,
      headers: this.headersFor(request),
      body: serializeBody(request.body),
    })

    if (response.ok === false) {
      throw await toNelcotaError(response)
    }

    // 204 and 202 (e.g. "a link is on its way") carry no body.
    const text = await response.text()

    if (text === '') {
      return undefined as T
    }

    return JSON.parse(text) as T
  }

  private headersFor(request: HttpRequest): Record<string, string> {
    const headers: Record<string, string> = { [API_KEY_HEADER]: this.publishableKey }

    if (request.body !== undefined) {
      headers['content-type'] = 'application/json'
    }

    if (request.accessToken !== undefined) {
      headers.authorization = `Bearer ${request.accessToken}`
    }

    return headers
  }
}

function serializeBody(body: unknown): string | undefined {
  if (body === undefined) {
    return undefined
  }

  return JSON.stringify(body)
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
