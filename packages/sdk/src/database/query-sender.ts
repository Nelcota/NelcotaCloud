import type { SessionManager } from '../auth/session-manager'
import type { HttpClient } from '../http/http-client'
import {
  type QueryRequest,
  type QueryResult,
  SINGLE_OBJECT_MEDIA_TYPE,
  countFromContentRange,
  queryString,
} from './query-request'

const REST_PATH = '/rest/v1'

/** Sends Data API requests as the logged-in user (anonymous without a session). */
export class QuerySender {
  private readonly http: HttpClient
  private readonly manager: SessionManager

  constructor(http: HttpClient, manager: SessionManager) {
    this.http = http
    this.manager = manager
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
    if (this.manager.current() === null) {
      return undefined
    }

    return this.manager.accessToken()
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
