/** A recorded request to the fake API. */
export type RecordedCall = {
  method: string
  path: string
  /** Decoded query parameters, in order. */
  query: [string, string][]
  headers: Record<string, string>
  body: unknown
}

type Reply = {
  status: number
  body?: unknown
  headers?: Record<string, string>
  /** Holds the reply back until it settles, to act while the request is in flight. */
  delay?: Promise<void>
}

/** A `fetch` stand-in that answers queued replies per `METHOD /path` and records every call. */
export class FakeApi {
  readonly calls: RecordedCall[] = []
  private readonly replies = new Map<string, Reply[]>()

  reply(route: string, reply: Reply): void {
    const queue = this.replies.get(route) ?? []
    queue.push(reply)
    this.replies.set(route, queue)
  }

  fetch: typeof fetch = async (input, init) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    const headers = Object.fromEntries(
      Object.entries((init?.headers ?? {}) as Record<string, string>),
    )
    const rawBody = init?.body
    const query: [string, string][] = []
    url.searchParams.forEach((value, key) => query.push([key, value]))
    this.calls.push({ method, path: url.pathname, query, headers, body: parseBody(rawBody) })
    const reply = this.replies.get(`${method} ${url.pathname}`)?.shift()

    if (reply === undefined) {
      return new Response(JSON.stringify({ error: 'not_found', message: 'no reply queued' }), {
        status: 404,
      })
    }

    await reply.delay

    return toResponse(reply)
  }

  callsTo(route: string): RecordedCall[] {
    return this.calls.filter((call) => `${call.method} ${call.path}` === route)
  }
}

function parseBody(rawBody: BodyInit | null | undefined): unknown {
  if (rawBody instanceof Blob) {
    return rawBody
  }

  if (typeof rawBody !== 'string') {
    return undefined
  }

  return JSON.parse(rawBody)
}

function toResponse(reply: Reply): Response {
  if (reply.status === 204) {
    return new Response(null, { status: 204, headers: reply.headers })
  }

  return new Response(JSON.stringify(reply.body ?? {}), {
    status: reply.status,
    headers: reply.headers,
  })
}

export function sessionTokens(
  overrides: { expiresIn?: number; refreshToken?: string } = {},
): object {
  return {
    access_token: 'access-token',
    token_type: 'Bearer',
    expires_in: overrides.expiresIn ?? 900,
    refresh_token: overrides.refreshToken ?? 'nc_rt_first',
    user: {
      id: '7d5e3c1a-0000-4000-8000-000000000001',
      email: 'ana@example.com',
      email_verified_at: null,
      banned_at: null,
      created_at: '2026-11-16T12:00:00Z',
      mfa_enabled: false,
      avatar_updated_at: null,
      user_metadata: {},
      app_metadata: {},
    },
  }
}
