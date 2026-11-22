import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components, operations } from '@/shared/api/api-schema'

type AuditPage = components['schemas']['AuditPage']
type AuditQuery = NonNullable<operations['list_audit_events']['parameters']['query']>

export type AuditKind = NonNullable<AuditQuery['kind']>

/** The filters the API applies to the log and to its CSV export. */
export type AuditFilter = {
  /** Only events about this user; the whole project without it. */
  userId?: string
  kind?: AuditKind
  /** Part of an email or IP address. */
  search?: string
  /** Only the last this many days; the whole log (90 days) without it. */
  days?: number
}

const PAGE_SIZE = 50

/** The filter as the API's query string. */
export function auditQuery(filter: AuditFilter): Omit<AuditQuery, 'before' | 'limit'> {
  return { user_id: filter.userId, kind: filter.kind, search: filter.search, days: filter.days }
}

/** One page of the project's activity log, newest first; `before` reads older events. */
export async function listAuditEvents(
  projectId: string,
  filter: AuditFilter,
  { before, signal }: { before?: number; signal?: AbortSignal },
): Promise<AuditPage> {
  const query = { ...auditQuery(filter), before, limit: PAGE_SIZE }
  const headers = projectHeaders(projectId)

  return dataOf(
    await apiClient.GET('/auth/v1/admin/audit-events', { params: { query }, headers, signal }),
  )
}
