import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

export type ApiUsagePeriod = '24h' | '7d' | '30d'
export type ApiUsageReport = components['schemas']['DataApiUsageReport']

/** The project's Data API traffic over the period, ending now. */
export async function readApiUsage(
  projectId: string,
  period: ApiUsagePeriod,
  signal?: AbortSignal,
): Promise<ApiUsageReport> {
  const headers = projectHeaders(projectId)
  const params = { query: { period } }

  return dataOf(await apiClient.GET('/database/v1/usage', { headers, params, signal }))
}
