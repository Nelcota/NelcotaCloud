import type { components } from '../../generated/api-schema'
import type { HttpClient } from '../../http/http-client'
import type { Session } from '../auth-types'
import { toSession } from '../login-results'

type SessionTokens = components['schemas']['SessionTokens']

/**
 * Trades a refresh token for a new session; the server then refuses the old refresh token.
 * `now` is the client's clock, so the expiry is on the same clock as every other session.
 */
export async function renewSession(
  http: HttpClient,
  refreshToken: string,
  now: () => number,
): Promise<Session> {
  const tokens = await http.request<SessionTokens>({
    method: 'POST',
    path: '/auth/v1/refresh',
    body: { refresh_token: refreshToken },
  })

  return toSession(tokens, now)
}
