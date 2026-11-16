import type { ApiHealth } from '@/modules/system-status/api/api-health'
import { API_BASE_URL } from '@/shared/api/api-base-url'
import { ApiError } from '@/shared/api/api-error'

const HEALTH_PATH = '/health'

/** Throws `ApiError` when the API does not answer its health check with success. */
export async function checkApiHealth(): Promise<ApiHealth> {
  const response = await fetch(`${API_BASE_URL}${HEALTH_PATH}`)

  if (response.ok === false) {
    throw new ApiError(response.status, `API answered ${response.status}`)
  }

  return { checkedAt: new Date() }
}
