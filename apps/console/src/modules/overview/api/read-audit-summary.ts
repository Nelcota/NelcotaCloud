import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

/** Login counts and the most refused addresses over the last `days` days. */
export async function readAuditSummary(
  projectId: string,
  days: number,
): Promise<components['schemas']['AuditSummary']> {
  const query = { days }
  const headers = projectHeaders(projectId)

  return dataOf(
    await apiClient.GET('/auth/v1/admin/audit-events/summary', { params: { query }, headers }),
  )
}
