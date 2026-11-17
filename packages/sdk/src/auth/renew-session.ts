import type { components } from '../generated/api-schema'
import type { HttpClient } from '../http/http-client'
import type { Session } from '../types'
import { toSession } from './login-results'

type SessionTokens = components['schemas']['SessionTokens']

/** Trades a refresh token for a new session; the server then refuses the old refresh token. */
export async function renewSession(http: HttpClient, refreshToken: string): Promise<Session> {
  const tokens = await http.request<SessionTokens>({
    method: 'POST',
    path: '/auth/v1/refresh',
    body: { refresh_token: refreshToken },
  })

  return toSession(tokens)
}
