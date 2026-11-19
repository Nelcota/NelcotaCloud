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
  const stored = host.store.load()

  if (host.current() !== session) {
    return host.current()
  }

  if (renewedElsewhere(stored, session)) {
    host.start(stored, sessionChangeEvent(session, stored))
    return stored
  }

  try {
    const renewed = await renewSession(host.http, session.refreshToken, host.now)

    return adoptRenewal(host, session, renewed)
  } catch (error) {
    return endIfRejected(host, session, error)
  }
}

/** What the user did meanwhile wins; a sign out in another tab (storage cleared) too. */
function adoptRenewal(host: RefreshHost, original: Session, renewed: Session): Session | null {
  if (host.current() !== original) {
    return host.current()
  }

  if (host.store.load() === null) {
    host.end()
    return null
  }

  host.start(renewed, 'TOKEN_REFRESHED')

  return renewed
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
  if (host.current() !== original) {
    return host.current()
  }

  if (isRefusal(error) === false) {
    throw error
  }

  await new Promise((resolve) => setTimeout(resolve, STORAGE_SETTLE_MS))
  const stored = host.store.load()

  if (host.current() !== original) {
    return host.current()
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

/** Another tab already renewed the session this tab still holds. */
function renewedElsewhere(stored: Session | null, held: Session): stored is Session {
  return stored !== null && stored.refreshToken !== held.refreshToken
}
