import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type User = components['schemas']['User']

/** No more logins; every session ends. */
export async function banUser(projectId: string, userId: string): Promise<User> {
  const params = { path: { user_id: userId } }
  const headers = projectHeaders(projectId)

  return dataOf(await apiClient.POST('/auth/v1/admin/users/{user_id}/ban', { params, headers }))
}
