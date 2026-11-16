import type { components } from '../generated/api-schema'
import type { HttpClient } from '../http/http-client'
import { NelcotaError } from '../http/nelcota-error'
import type { AuthEvent, AuthStateListener, Session } from '../types'
import { toSession } from './login-results'
import type { SessionStore } from './session-store'

type SessionTokens = components['schemas']['SessionTokens']

/** Access tokens are renewed this long before they expire, so requests never carry a dead one. */
const REFRESH_MARGIN_MS = 60_000
const UNAUTHORIZED = 401
const FORBIDDEN = 403

/** Holds the current session, renews it and tells listeners when it changes. */
export class SessionManager {
  private readonly http: HttpClient
  private readonly store: SessionStore
  private readonly listeners = new Set<AuthStateListener>()
  private session: Session | null
  private refreshing: Promise<Session | null> | null = null

  constructor(http: HttpClient, store: SessionStore) {
    this.http = http
    this.store = store
    this.session = store.load()
  }

  current(): Session | null {
    return this.session
  }

  start(session: Session, event: AuthEvent): void {
    this.session = session
    this.store.save(session)
    this.notify(event)
  }

  end(): void {
    this.session = null
    this.store.clear()
    this.notify('SIGNED_OUT')
  }

  /** A valid access token, renewed first when it is about to expire. */
  async accessToken(): Promise<string> {
    const session = this.session

    if (session === null) {
      throw notAuthenticated()
    }

    if (session.expiresAt - REFRESH_MARGIN_MS > Date.now()) {
      return session.accessToken
    }

    const refreshed = await this.refresh()

    if (refreshed === null) {
      throw notAuthenticated()
    }

    return refreshed.accessToken
  }

  /** Concurrent callers share one refresh: refresh tokens are single use. */
  refresh(): Promise<Session | null> {
    if (this.refreshing !== null) {
      return this.refreshing
    }

    this.refreshing = this.performRefresh().finally(() => {
      this.refreshing = null
    })

    return this.refreshing
  }

  subscribe(listener: AuthStateListener): () => void {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Refresh tokens are single use and tabs share one stored session: a second tab refreshing
   * the same token would look like token theft and end the session. So tabs refresh one at a
   * time (Web Locks), and a tab adopts the session another tab already renewed.
   */
  private async performRefresh(): Promise<Session | null> {
    const session = this.session

    if (session === null) {
      return null
    }

    return withLock(this.store.lockName(), () => this.refreshOrAdopt(session))
  }

  private async refreshOrAdopt(session: Session): Promise<Session | null> {
    const stored = this.store.load()

    if (stored !== null && stored.refreshToken !== session.refreshToken) {
      this.start(stored, 'TOKEN_REFRESHED')
      return stored
    }

    try {
      const tokens = await this.http.request<SessionTokens>({
        method: 'POST',
        path: '/auth/v1/refresh',
        body: { refresh_token: session.refreshToken },
      })
      const renewed = toSession(tokens)
      this.start(renewed, 'TOKEN_REFRESHED')

      return renewed
    } catch (error) {
      return this.endIfRejected(error)
    }
  }

  /** A refused refresh token (revoked, reused, banned user) ends the session; other errors propagate. */
  private endIfRejected(error: unknown): null {
    if (error instanceof NelcotaError && [UNAUTHORIZED, FORBIDDEN].includes(error.status)) {
      this.end()
      return null
    }

    throw error
  }

  private notify(event: AuthEvent): void {
    for (const listener of this.listeners) {
      listener(event, this.session)
    }
  }
}

function notAuthenticated(): NelcotaError {
  return new NelcotaError({
    status: UNAUTHORIZED,
    code: 'not_authenticated',
    message: 'No active session; sign in first',
    requestId: null,
  })
}

/** Runs `task` while holding a lock shared by every tab of the origin, when the browser has one. */
async function withLock<T>(name: string, task: () => Promise<T>): Promise<T> {
  const locks = globalThis.navigator?.locks

  if (locks === undefined) {
    return task()
  }

  return locks.request(name, task)
}
