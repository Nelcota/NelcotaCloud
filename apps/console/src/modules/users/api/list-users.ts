import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type UserPage = components['schemas']['UserPage']

/** One page of the project's users, optionally searched by email. */
export async function listUsers(projectId: string, email: string): Promise<UserPage> {
  const options = { params: { query: emailQuery(email) }, headers: projectHeaders(projectId) }

  return dataOf(await apiClient.GET('/auth/v1/admin/users', options))
}

/** A blank search lists everyone. */
function emailQuery(email: string): { email?: string } {
  const search = email.trim()

  if (search === '') {
    return {}
  }

  return { email: search }
}
