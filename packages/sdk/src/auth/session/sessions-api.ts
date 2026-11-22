import type { HttpMethod } from '../../http/http-client'
import type { SessionSummary } from '../auth-types'
import { type AuthorizedContext, authorizedRequest } from '../../http/authorized-request'

/** Lists and revokes the current user’s sessions. */
export class SessionsApi {
  private readonly context: AuthorizedContext

  constructor(context: AuthorizedContext) {
    this.context = context
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

  private call<T>(method: HttpMethod, path: string): Promise<T> {
    return authorizedRequest<T>(this.context, { method, path })
  }
}
