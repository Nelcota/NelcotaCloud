import createClient from 'openapi-fetch'
import type { Middleware } from 'openapi-fetch'

import { API_BASE_URL } from '@/shared/api/api-base-url'
import type { paths } from '@/shared/api/api-schema'
import { nelcota } from '@/shared/auth/nelcota'

const AUTHORIZATION = 'Authorization'

/** Sends the console account's access token (renewed by the SDK when needed). */
const authenticate: Middleware = {
  async onRequest({ request }) {
    if (nelcota.auth.getSession() === null || request.headers.has(AUTHORIZATION)) {
      return request
    }

    request.headers.set(AUTHORIZATION, `Bearer ${await nelcota.auth.getAccessToken()}`)

    return request
  },
}

/**
 * Typed client generated from the API's OpenAPI document: paths, bodies and responses are
 * checked at build time. Regenerate the types with `npm run api:types` after the API changes.
 */
export const apiClient = createClient<paths>({ baseUrl: API_BASE_URL })
apiClient.use(authenticate)

/** Names the project a request manages; the API checks the account is a member. */
export function projectHeaders(projectId: string): Record<string, string> {
  return { 'x-nelcota-project': projectId }
}
