import type { PeriodQuery } from '@/modules/activity/model/activity-period'
import type { AuditKind } from '@/modules/activity/model/activity-search'
import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'

export type AuditExportFilter = PeriodQuery & { kind?: AuditKind; search?: string }

/** Every event the filter matches, as a CSV file the API builds. */
export async function exportAuditEvents(
  projectId: string,
  filter: AuditExportFilter,
): Promise<Blob> {
  const headers = projectHeaders(projectId)
  const result = await apiClient.GET('/auth/v1/admin/audit-events/export', {
    params: { query: filter },
    headers,
    parseAs: 'blob',
  })

  return dataOf(result)
}
