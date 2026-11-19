import type { PeriodQuery } from '@/modules/activity/model/activity-period'
import type { AuditKind } from '@/modules/activity/model/activity-search'
import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type AuditPage = components['schemas']['AuditPage']

export type AuditFilter = {
  /** Only events about this user; the whole project without it. */
  userId?: string
  /** The stretch of the log; the whole 90 days without it. */
  period?: PeriodQuery
  kind?: AuditKind
  /** Part of the email or IP address. */
  search?: string
  /** The previous page's `next_before`, for older events. */
  before?: number
}

const PAGE_SIZE = 30

/** One page of the project's activity log, newest first. */
export async function listAuditEvents(projectId: string, filter: AuditFilter): Promise<AuditPage> {
  const query = {
    user_id: filter.userId,
    ...filter.period,
    kind: filter.kind,
    search: filter.search,
    before: filter.before,
    limit: PAGE_SIZE,
  }
  const headers = projectHeaders(projectId)

  return dataOf(await apiClient.GET('/auth/v1/admin/audit-events', { params: { query }, headers }))
}
