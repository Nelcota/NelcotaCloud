import type { HttpClient } from '../../http/http-client'
import type { AuthEvent, AuthStateListener, Session, User } from '../auth-types'
import { AuthListeners } from './auth-listeners'
import { notAuthenticated } from './not-authenticated'
import { sessionChangeEvent } from './session-change'
import { type RefreshHost, refreshOrAdopt } from './session-refresh'
import type { SessionStore } from './session-store'
import { withTabLock } from './tab-lock'

/** Access tokens are renewed this long before they expire, so requests never carry a dead one. */
const REFRESH_MARGIN_MS = 60_000

/** Holds the current session, renews it and tells listeners when it changes. */
export class SessionManager {
  private readonly http: HttpClient
  private readonly store: SessionStore
  private readonly now: () => number
  private readonly listeners = new AuthListeners()
  private readonly stopWatchingOtherTabs: (() => void) | null
  private session: Session | null
  private sessionGeneration = 0
  private refreshing: Promise<Session | null> | null = null

  constructor(http: HttpClient, store: SessionStore, now: () => number = Date.now) {
    this.http = http
    this.store = store
    this.now = now
    this.session = store.load()
    this.stopWatchingOtherTabs = store.watchOtherTabs((stored) => this.followOtherTab(stored))
  }

  current(): Session | null {
    return this.session
  }

  start(session: Session, event: AuthEvent): void {
    if (event === 'SIGNED_IN') {
      this.bumpGeneration()
    }

    this.session = session
    this.store.save(session)
    this.listeners.notify(event, session)
  }

  /** Keeps the stored user current after a change to the profile (e.g. a new photo). */
  updateUser(user: User): void {
    if (this.session?.user.id !== user.id) {
      return
    }

    this.start({ ...this.session, user }, 'USER_UPDATED')
  }

  end(): void {
    this.bumpGeneration()
    this.session = null
    this.store.clear()
    this.listeners.notify('SIGNED_OUT', null)
  }

  generation(): number {
    return this.sessionGeneration
  }

  endIfGenerationMatches(generation: number): boolean {
    if (this.sessionGeneration !== generation) {
      return false
    }

    this.end()

    return true
  }

  /** A valid access token, renewed first when it is about to expire. */
  async accessToken(): Promise<string> {
    const session = this.session

    if (session === null) {
      throw notAuthenticated()
    }

    if (session.expiresAt - REFRESH_MARGIN_MS > this.now()) {
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
    return this.listeners.add(listener)
  }

  dispose(): void {
    this.stopWatchingOtherTabs?.()
    this.listeners.clear()
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

    const host: RefreshHost = {
      http: this.http,
      store: this.store,
      now: this.now,
      current: () => this.session,
      start: (renewed, event) => this.start(renewed, event),
      end: () => this.end(),
    }

    return withTabLock(this.store.lockName(), () => refreshOrAdopt(host, session))
  }

  /** Another tab already wrote the change to storage, so this tab only mirrors it. */
  private followOtherTab(stored: Session | null): void {
    const previous = this.session

    if (previous === null && stored === null) {
      return
    }

    const event = sessionChangeEvent(previous, stored)

    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
      this.bumpGeneration()
    }

    this.session = stored
    this.listeners.notify(event, stored)
  }

  /** A new or ended session: work started for the previous one must not touch this one. */
  private bumpGeneration(): void {
    this.sessionGeneration += 1
  }
}
