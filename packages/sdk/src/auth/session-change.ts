import type { AuthEvent, Session } from '../types'

/** The event that describes going from `previous` to `next` (e.g. a change made by another tab). */
export function sessionChangeEvent(previous: Session | null, next: Session | null): AuthEvent {
  if (next === null) {
    return 'SIGNED_OUT'
  }

  if (previous === null || previous.user.id !== next.user.id) {
    return 'SIGNED_IN'
  }

  if (previous.refreshToken === next.refreshToken) {
    return 'USER_UPDATED'
  }

  return 'TOKEN_REFRESHED'
}
