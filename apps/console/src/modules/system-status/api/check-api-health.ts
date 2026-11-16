import type { ApiHealth } from '@/modules/system-status/api/api-health'
import { apiClient } from '@/shared/api/api-client'
import { ApiError } from '@/shared/api/api-error'

/** Throws `ApiError` when the API does not answer its health check with success. */
export async function checkApiHealth(): Promise<ApiHealth> {
  const { response } = await apiClient.GET('/health', { parseAs: 'text' })

  if (response.ok === false) {
    throw new ApiError({
      status: response.status,
      code: 'unhealthy',
      message: `API answered ${response.status}`,
    })
  }

  return { checkedAt: new Date() }
}
