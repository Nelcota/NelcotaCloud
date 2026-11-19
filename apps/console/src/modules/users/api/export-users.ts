import { emailQuery, statusQuery } from '@/modules/users/api/user-filter-query'
import type { UserStatusFilter } from '@/modules/users/model/user-status-filter'
import type { UserOrder } from '@/modules/users/model/users-search'
import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'

export type UserExportQuery = { email: string; status: UserStatusFilter; order: UserOrder }

/** Every user the list's filters match, in its order, as a CSV file the API builds. */
export async function exportUsers(projectId: string, query: UserExportQuery): Promise<Blob> {
  const filters = { ...emailQuery(query.email), ...statusQuery(query.status), order: query.order }
  const result = await apiClient.GET('/auth/v1/admin/users/export', {
    params: { query: filters },
    headers: projectHeaders(projectId),
    parseAs: 'blob',
  })

  return dataOf(result)
}
