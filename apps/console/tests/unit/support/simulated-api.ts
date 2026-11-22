import { vi } from 'vitest'

/** One answer of the simulated API: the status and the JSON body (none for 204). */
export type SimulatedReply = { status: number; body?: unknown }

export type SimulatedCall = { method: string; path: string; search: string; body: unknown }

type Route = { method: string; path: string; reply: SimulatedReply }

/**
 * Stands in for the API: requests are matched by method and path, recorded, and answered with
 * the canned reply. Install it before importing the console modules, which keep the `fetch`
 * that exists when `apiClient` is created.
 */
export class SimulatedApi {
  readonly calls: SimulatedCall[] = []
  readonly #routes: Route[] = []

  on(method: string, path: string, reply: SimulatedReply): this {
    this.#routes.unshift({ method, path, reply })

    return this
  }

  install(): void {
    vi.stubGlobal('fetch', (input: Request) => this.#answer(input))
  }

  callsTo(method: string, path: string): SimulatedCall[] {
    return this.calls.filter((call) => call.method === method && call.path === path)
  }

  async #answer(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const body = await bodyOf(request)
    this.calls.push({ method: request.method, path: url.pathname, search: url.search, body })
    const route = this.#routes.find(
      (candidate) => candidate.method === request.method && candidate.path === url.pathname,
    )

    if (route === undefined) {
      return Response.json({ error: 'not_found', message: 'no simulated route' }, { status: 404 })
    }

    if (route.reply.body === undefined) {
      return new Response(null, { status: route.reply.status })
    }

    return Response.json(route.reply.body, { status: route.reply.status })
  }
}

async function bodyOf(request: Request): Promise<unknown> {
  const text = await request.text()

  if (text === '') {
    return undefined
  }

  return JSON.parse(text) as unknown
}
