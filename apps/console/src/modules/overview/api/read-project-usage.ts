import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

/** Users active this month and last month (UTC calendar months). */
export async function readProjectUsage(
  projectId: string,
): Promise<components['schemas']['ProjectUsage']> {
  return dataOf(
    await apiClient.GET('/auth/v1/admin/usage', {
      params: { query: { cached: true } },
      headers: projectHeaders(projectId),
    }),
  )
}
