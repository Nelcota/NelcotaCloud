import createClient from 'openapi-fetch'
import type { Client, Middleware } from 'openapi-fetch'

import { API_BASE_URL } from '@/shared/api/api-base-url'
import type { paths } from '@/shared/api/api-schema'
import { nelcota } from '@/shared/auth/nelcota'
import type { AuthClient } from '@nelcota/sdk'

const AUTHORIZATION = 'Authorization'

type AuthTokenSource = Pick<AuthClient, 'getSession' | 'getAccessToken'>

/** Creates an API client that sends the supplied account's access token when needed. */
export function createApiClient(auth: AuthTokenSource, baseUrl = API_BASE_URL): Client<paths> {
  const client = createClient<paths>({ baseUrl })
  const authenticate: Middleware = {
    async onRequest({ request }) {
      if (auth.getSession() === null || request.headers.has(AUTHORIZATION)) {
        return request
      }

      request.headers.set(AUTHORIZATION, `Bearer ${await auth.getAccessToken()}`)

      return request
    },
  }

  client.use(authenticate)

  return client
}

/**
 * Typed client generated from the API's OpenAPI document: paths, bodies and responses are
 * checked at build time. Regenerate the types with `npm run api:types` after the API changes.
 */
export const apiClient = createApiClient(nelcota.auth)

/** Public routes can start immediately, even while an expired account session renews. */
export const publicApiClient = createClient<paths>({ baseUrl: API_BASE_URL })

/** Names the project a request manages; the API checks the account is a member. */
export function projectHeaders(projectId: string): Record<string, string> {
  return { 'x-nelcota-project': projectId }
}
