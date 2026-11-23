import { CliError } from '../cli/cli-error'
import type { FetchFunction } from '../cli/command-context'

export type HttpRequest = {
  method: 'GET' | 'POST'
  url: string
  headers: Record<string, string>
  body?: unknown
  timeoutMs: number
}

/** The API refused the call: its stable code and message, shown to the user as is. */
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

/** Sends one JSON request; a refusal becomes an `ApiCallError`, a dead server a `CliError`. */
export async function sendJson(
  fetchFunction: FetchFunction,
  request: HttpRequest,
): Promise<unknown> {
  const response = await fetchFunction(request.url, {
    method: request.method,
    headers: headersOf(request),
    body: bodyOf(request),
    signal: AbortSignal.timeout(request.timeoutMs),
  }).catch((error: unknown) => {
    throw new CliError(
      `Não foi possível falar com a API em ${originOf(request.url)} (${reasonOf(error)}).`,
    )
  })
  const payload = await readPayload(response)

  if (response.ok === false) {
    throw errorOf(response.status, payload)
  }

  return payload
}

function headersOf(request: HttpRequest): Record<string, string> {
  if (request.body === undefined) {
    return request.headers
  }

  return { ...request.headers, 'content-type': 'application/json' }
}

function bodyOf(request: HttpRequest): string | undefined {
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

/**
 * The API's error body is `{ error, message }`; `code` is accepted too, so a server that names
 * the field either way is understood.
 */
export function errorOf(status: number, payload: unknown): ApiCallError {
  if (typeof payload === 'object' && payload !== null && 'message' in payload) {
    return new ApiCallError({ status, code: codeOf(payload), message: String(payload.message) })
  }

  return new ApiCallError({ status, code: 'unknown_error', message: `A API respondeu ${status}.` })
}

function codeOf(payload: object): string {
  if ('error' in payload && typeof payload.error === 'string') {
    return payload.error
  }

  if ('code' in payload && typeof payload.code === 'string') {
    return payload.code
  }

  return 'unknown_error'
}

function originOf(url: string): string {
  return new URL(url).origin
}

function reasonOf(error: unknown): string {
  if (error instanceof Error && error.name === 'TimeoutError') {
    return 'tempo esgotado'
  }

  if (error instanceof Error && error.cause instanceof Error) {
    return error.cause.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'falha de rede'
}
