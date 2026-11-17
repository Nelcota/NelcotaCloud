import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type User = components['schemas']['User']

export async function getUser(projectId: string, userId: string): Promise<User> {
  const params = { path: { user_id: userId } }
  const headers = projectHeaders(projectId)

  return dataOf(await apiClient.GET('/auth/v1/admin/users/{user_id}', { params, headers }))
}
