import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

/** Logins and sign-ups per UTC day, oldest first, every day present. */
export async function readDailyUsage(
  projectId: string,
  days: number,
): Promise<components['schemas']['DailyUsage']> {
  const headers = projectHeaders(projectId)
  const params = { query: { days } }

  return dataOf(await apiClient.GET('/auth/v1/admin/usage/daily', { headers, params }))
}
