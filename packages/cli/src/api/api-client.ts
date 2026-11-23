import type { FetchFunction } from '../cli/command-context'
import type { ApiTarget } from '../config/api-target'
import { sendJson } from './http-json'

/** Calls stop after this long, so the CLI never hangs on a dead connection. */
const DEFAULT_TIMEOUT_MS = 30_000

export type ApiCall = {
  path: string
  /** Appended as `?a=1&b=2`. */
  query?: Record<string, string>
  body?: unknown
  timeoutMs?: number
}

/** The NelcotaCloud API, authenticated with the project's secret key (`apikey` header). */
export class NelcotaApi {
  readonly #target: ApiTarget
  readonly #fetch: FetchFunction

  constructor(target: ApiTarget, fetchFunction: FetchFunction) {
    this.#target = target
    this.#fetch = fetchFunction
  }

  get(call: ApiCall): Promise<unknown> {
    return this.#send('GET', call)
  }

  post(call: ApiCall): Promise<unknown> {
    return this.#send('POST', call)
  }

  #send(method: 'GET' | 'POST', call: ApiCall): Promise<unknown> {
    return sendJson(this.#fetch, {
      method,
      url: this.#urlOf(call),
      headers: { apikey: this.#target.secretKey },
      body: call.body,
      timeoutMs: call.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    })
  }

  #urlOf(call: ApiCall): string {
    const search = new URLSearchParams(call.query).toString()

    if (search === '') {
      return `${this.#target.apiUrl}${call.path}`
    }

    return `${this.#target.apiUrl}${call.path}?${search}`
  }
}
