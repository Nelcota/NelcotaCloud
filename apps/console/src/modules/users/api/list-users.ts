import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components, operations } from '@/shared/api/api-schema'

type UserPage = components['schemas']['UserPage']

type UserStatus = NonNullable<
  NonNullable<operations['list_users']['parameters']['query']>['status']
>

/** `all` sends no filter. */
export type UserStatusFilter = UserStatus | 'all'

export type UserListQuery = {
  email: string
  status: UserStatusFilter
  offset: number
  limit: number
}

/** One page of the project's users, newest first, optionally searched and filtered. */
export async function listUsers(
  projectId: string,
  query: UserListQuery,
  signal?: AbortSignal,
): Promise<UserPage> {
  const filters = { ...emailQuery(query.email), ...statusQuery(query.status) }
  const params = { query: { ...filters, offset: query.offset, limit: query.limit } }

  return dataOf(
    await apiClient.GET('/auth/v1/admin/users', {
      params,
      headers: projectHeaders(projectId),
      signal,
    }),
  )
}

/** A blank search lists everyone. */
function emailQuery(email: string): { email?: string } {
  const search = email.trim()

  if (search === '') {
    return {}
  }

  return { email: search }
}

function statusQuery(status: UserStatusFilter): { status?: UserStatus } {
  if (status === 'all') {
    return {}
  }

  return { status }
}
