import { type AuditFilter, auditQuery } from '@/modules/activity/api/list-audit-events'
import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'

/** Every event that matches the filter, as the CSV file the API writes. */
export async function exportAuditEvents(projectId: string, filter: AuditFilter): Promise<Blob> {
  const query = auditQuery(filter)
  const headers = projectHeaders(projectId)

  return dataOf(
    await apiClient.GET('/auth/v1/admin/audit-events/export', {
      params: { query },
      headers,
      parseAs: 'blob',
    }),
  )
}
