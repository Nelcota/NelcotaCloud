import type { Session } from '../auth/auth-types'
import type { HttpClient } from '../http/http-client'
import {
  type QueryRequest,
  type QueryResult,
  SINGLE_OBJECT_MEDIA_TYPE,
  countFromContentRange,
  queryString,
} from './query-request'

const REST_PATH = '/rest/v1'

export type QuerySession = {
  current(): Session | null
  accessToken(): Promise<string>
}

/** Sends Data API requests as the logged-in user (anonymous without a session). */
export class QuerySender {
  private readonly http: HttpClient
  private readonly session: QuerySession

  constructor(http: HttpClient, session: QuerySession) {
    this.http = http
    this.session = session
  }

  async send<T>(request: QueryRequest): Promise<QueryResult<T>> {
    const accessToken = await this.accessToken()
    const response = await this.http.send<T>({
      method: request.method,
      path: `${REST_PATH}${request.path}${queryString(request.params)}`,
      body: request.body,
      accessToken,
      headers: headersOf(request),
    })

    return {
      data: response.data,
      count: countFromContentRange(response.headers.get('content-range')),
    }
  }

  /** Row level security sees the user when there is a session, `anon` otherwise. */
  private async accessToken(): Promise<string | undefined> {
    if (this.session.current() === null) {
      return undefined
    }

    return this.session.accessToken()
  }
}

function headersOf(request: QueryRequest): Record<string, string> {
  const headers: Record<string, string> = {}

  if (request.prefer.length > 0) {
    headers.prefer = request.prefer.join(',')
  }

  if (request.single) {
    headers.accept = SINGLE_OBJECT_MEDIA_TYPE
  }

  return headers
}
