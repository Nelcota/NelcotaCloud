import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type AuditPage = components['schemas']['AuditPage']

export type AuditFilter = {
  /** Only events about this user; the whole project without it. */
  userId?: string
  /** The previous page's `next_before`, for older events. */
  before?: number
}

const PAGE_SIZE = 30

/** One page of the project's activity log, newest first. */
export async function listAuditEvents(projectId: string, filter: AuditFilter): Promise<AuditPage> {
  const query = { user_id: filter.userId, before: filter.before, limit: PAGE_SIZE }
  const headers = projectHeaders(projectId)

  return dataOf(await apiClient.GET('/auth/v1/admin/audit-events', { params: { query }, headers }))
}
