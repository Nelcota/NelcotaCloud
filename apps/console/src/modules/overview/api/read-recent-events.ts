import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

/** The newest events of the project's activity log, newest first. */
export async function readRecentEvents(
  projectId: string,
  limit: number,
): Promise<components['schemas']['AuditPage']> {
  const query = { limit }
  const headers = projectHeaders(projectId)

  return dataOf(await apiClient.GET('/auth/v1/admin/audit-events', { params: { query }, headers }))
}
