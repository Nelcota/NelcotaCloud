import type { HttpClient } from '../../http/http-client'
import { NelcotaError } from '../../http/nelcota-error'
import type { AuthEvent, Session } from '../auth-types'
import { renewSession } from './renew-session'
import { sessionChangeEvent } from './session-change'
import type { SessionStore } from './session-store'

const UNAUTHORIZED = 401
const FORBIDDEN = 403
/** How long a refused tab waits for another tab's write to storage to become visible. */
const STORAGE_SETTLE_MS = 300

/** What a refresh reads and changes of the session manager. */
export type RefreshHost = {
  http: HttpClient
  store: SessionStore
  now: () => number
  current(): Session | null
  start(session: Session, event: AuthEvent): void
  end(): void
}

/** Renews `session`, or adopts the session another tab already renewed (run under the tab lock). */
export async function refreshOrAdopt(host: RefreshHost, session: Session): Promise<Session | null> {
  const current = host.current()
  const stored = host.store.load()

  if (isSameRefresh(current, session) === false) {
    return current
  }

  if (stored === null) {
    host.end()

    return null
  }

  if (renewedElsewhere(stored, session)) {
    host.start(stored, sessionChangeEvent(session, stored))
    return stored
  }

  let renewed: Session
  try {
    renewed = await renewSession(host.http, session.refreshToken, host.now)
  } catch (error) {
    return endIfRejected(host, session, error)
  }

  return adoptRenewal(host, session, renewed)
}

/** What the user did meanwhile wins; a sign out in another tab (storage cleared) too. */
function adoptRenewal(host: RefreshHost, original: Session, renewed: Session): Session | null {
  const current = host.current()

  if (isSameRefresh(current, original) === false) {
    return current
  }

  const stored = host.store.load()

  if (stored === null) {
    host.end()

    return null
  }

  if (renewedElsewhere(stored, original)) {
    host.start(stored, sessionChangeEvent(original, stored))

    return stored
  }

  const next = withLatestUser(current, original, renewed)
  host.start(next, 'TOKEN_REFRESHED')

  return next
}

function withLatestUser(current: Session, original: Session, renewed: Session): Session {
  if (current.user === original.user) {
    return renewed
  }

  return { ...renewed, user: current.user }
}

/**
 * A refused token (revoked, reused, banned user) ends the session, unless another tab renewed
 * it meanwhile: its write to storage may land a moment late. Other errors propagate.
 */
async function endIfRejected(
  host: RefreshHost,
  original: Session,
  error: unknown,
): Promise<Session | null> {
  const current = host.current()

  if (isSameRefresh(current, original) === false) {
    return current
  }

  if (isRefusal(error) === false) {
    throw error
  }

  await new Promise((resolve) => setTimeout(resolve, STORAGE_SETTLE_MS))
  const latest = host.current()
  const stored = host.store.load()

  if (isSameRefresh(latest, original) === false) {
    return latest
  }

  if (renewedElsewhere(stored, original)) {
    host.start(stored, sessionChangeEvent(original, stored))
    return stored
  }

  host.end()
  return null
}

function isRefusal(error: unknown): boolean {
  return error instanceof NelcotaError && [UNAUTHORIZED, FORBIDDEN].includes(error.status)
}

function isSameRefresh(current: Session | null, original: Session): current is Session {
  return current !== null && current.refreshToken === original.refreshToken
}

/** Another tab already renewed the session this tab still holds. */
function renewedElsewhere(stored: Session | null, held: Session): stored is Session {
  return stored !== null && stored.refreshToken !== held.refreshToken
}
