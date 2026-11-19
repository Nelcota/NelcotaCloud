import { NelcotaError } from '../../http/nelcota-error'

const UNAUTHORIZED = 401

/** Thrown when a call needs the logged-in user and there is no session. */
export function notAuthenticated(): NelcotaError {
  return new NelcotaError({
    status: UNAUTHORIZED,
    code: 'not_authenticated',
    message: 'No active session; sign in first',
    requestId: null,
  })
}
