import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type UserPage = components['schemas']['UserPage']

export type UserListQuery = {
  email: string
  offset: number
  limit: number
}

/** One page of the project's users, newest first, optionally searched by email. */
export async function listUsers(projectId: string, query: UserListQuery): Promise<UserPage> {
  const params = { query: { ...emailQuery(query.email), offset: query.offset, limit: query.limit } }

  return dataOf(
    await apiClient.GET('/auth/v1/admin/users', { params, headers: projectHeaders(projectId) }),
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
