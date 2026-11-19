import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { UserStatusFilter } from '@/modules/users/model/user-status-filter'
import type { UserOrder } from '@/modules/users/model/users-search'
import { emailQuery, statusQuery } from '@/modules/users/api/user-filter-query'
import type { components } from '@/shared/api/api-schema'

type UserPage = components['schemas']['UserCursorPageResponse']

export type UserListQuery = {
  email: string
  status: UserStatusFilter
  order: UserOrder
  before?: string
  limit: number
}

/** One page of the project's users in the chosen order, optionally searched and filtered. */
export async function listUsers(projectId: string, query: UserListQuery): Promise<UserPage> {
  const filters = { ...emailQuery(query.email), ...statusQuery(query.status) }
  const params = {
    query: { ...filters, order: query.order, before: query.before, limit: query.limit },
  }

  return dataOf(
    await apiClient.GET('/auth/v1/admin/users/page', {
      params,
      headers: projectHeaders(projectId),
    }),
  )
}
