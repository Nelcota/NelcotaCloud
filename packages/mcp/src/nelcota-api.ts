import type { McpConfig } from './config'

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export type ApiRequest = {
  method: Method
  path: string
  /** Appended as `?a=1&b=2`; repeated names stay repeated (filters). */
  query?: readonly (readonly [string, string])[]
  body?: unknown
  /** The Data API's `Prefer` header (`return=representation`). */
  prefer?: string
}

/** The API refused the call: its stable code and message, given back to the agent as is. */
export class ApiCallError extends Error {
  readonly status: number
  readonly code: string

  constructor(details: { status: number; code: string; message: string }) {
    super(details.message)
    this.name = 'ApiCallError'
    this.status = details.status
    this.code = details.code
  }
}

/** Calls stop after this long, so an agent never waits on a hung request. */
const TIMEOUT_MS = 30_000

/** The NelcotaCloud API, authenticated with the project's secret key. */
export class NelcotaApi {
  readonly #config: McpConfig

  constructor(config: McpConfig) {
    this.#config = config
  }

  async call(request: ApiRequest): Promise<unknown> {
    const response = await fetch(this.#urlOf(request), {
      method: request.method,
      headers: this.#headersOf(request),
      body: bodyOf(request),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const payload = await readPayload(response)

    if (response.ok === false) {
      throw errorOf(response.status, payload)
    }

    return payload
  }

  #urlOf(request: ApiRequest): string {
    const params = new URLSearchParams(request.query?.map(([name, value]) => [name, value]))
    const search = params.toString()

    if (search === '') {
      return `${this.#config.apiUrl}${request.path}`
    }

    return `${this.#config.apiUrl}${request.path}?${search}`
  }

  #headersOf(request: ApiRequest): Record<string, string> {
    const headers: Record<string, string> = { apikey: this.#config.secretKey }

    if (request.body !== undefined) {
      headers['content-type'] = 'application/json'
    }

    if (request.prefer !== undefined) {
      headers.prefer = request.prefer
    }

    return headers
  }
}

function bodyOf(request: ApiRequest): string | undefined {
  if (request.body === undefined) {
    return undefined
  }

  return JSON.stringify(request.body)
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text()

  if (text === '') {
    return null
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function errorOf(status: number, payload: unknown): ApiCallError {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'error' in payload &&
    'message' in payload
  ) {
    return new ApiCallError({
      status,
      code: String(payload.error),
      message: String(payload.message),
    })
  }

  return new ApiCallError({ status, code: 'unknown_error', message: `A API respondeu ${status}.` })
}
