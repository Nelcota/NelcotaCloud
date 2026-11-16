import createClient from 'openapi-fetch'

import { API_BASE_URL } from '@/shared/api/api-base-url'
import type { paths } from '@/shared/api/api-schema'

/**
 * Typed client generated from the API's OpenAPI document: paths, bodies and responses are
 * checked at build time. Regenerate the types with `npm run api:types` after the API changes.
 */
export const apiClient = createClient<paths>({ baseUrl: API_BASE_URL })
