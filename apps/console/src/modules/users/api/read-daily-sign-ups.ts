import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

/** Logins and sign-ups per UTC day over the last `days` days, oldest first. */
export async function readDailySignUps(
  projectId: string,
  days: number,
): Promise<components['schemas']['DailyUsage']> {
  const query = { days }
  const headers = projectHeaders(projectId)

  return dataOf(await apiClient.GET('/auth/v1/admin/usage/daily', { params: { query }, headers }))
}
