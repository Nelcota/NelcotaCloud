import type { PeriodQuery } from '@/modules/activity/model/activity-period'
import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type AuditSummary = components['schemas']['AuditSummary']

/** Counts and the most refused IP addresses over the period. */
export async function readAuditSummary(
  projectId: string,
  period: PeriodQuery,
): Promise<AuditSummary> {
  const headers = projectHeaders(projectId)

  return dataOf(
    await apiClient.GET('/auth/v1/admin/audit-events/summary', {
      params: { query: period },
      headers,
    }),
  )
}
