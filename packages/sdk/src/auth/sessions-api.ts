import type { HttpClient, HttpMethod } from '../http/http-client'
import type { SessionSummary } from '../types'
import type { SessionManager } from './session-manager'

type SessionsContext = { http: HttpClient; manager: SessionManager }

/** The devices where the logged-in user is logged in. */
export class SessionsApi {
  private readonly http: HttpClient
  private readonly manager: SessionManager

  constructor(context: SessionsContext) {
    this.http = context.http
    this.manager = context.manager
  }

  list(): Promise<SessionSummary[]> {
    return this.call<SessionSummary[]>('GET', '/auth/v1/sessions')
  }

  /** Logs one device out. */
  async revoke(sessionId: string): Promise<void> {
    await this.call<void>('DELETE', `/auth/v1/sessions/${encodeURIComponent(sessionId)}`)
  }

  /** Logs out every device except this one. */
  async revokeOthers(): Promise<void> {
    await this.call<void>('DELETE', '/auth/v1/sessions')
  }

  private async call<T>(method: HttpMethod, path: string): Promise<T> {
    const accessToken = await this.manager.accessToken()

    return this.http.request<T>({ method, path, accessToken })
  }
}
