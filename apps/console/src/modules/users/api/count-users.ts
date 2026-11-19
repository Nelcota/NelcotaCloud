import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { UserStatusFilter } from '@/modules/users/model/user-status-filter'
import { emailQuery, statusQuery } from '@/modules/users/api/user-filter-query'

/** Without a filter, every user of the project. */
export type UserCountFilter = { email: string; status: UserStatusFilter }

const EVERYONE: UserCountFilter = { email: '', status: 'all' }

export async function countUsers(
  projectId: string,
  filter: UserCountFilter = EVERYONE,
): Promise<number> {
  const query = { ...emailQuery(filter.email), ...statusQuery(filter.status), limit: 0 }
  const page = dataOf(
    await apiClient.GET('/auth/v1/admin/users', {
      params: { query },
      headers: projectHeaders(projectId),
    }),
  )

  return page.total
}
