import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type UserSessions = components['schemas']['UserSessions']

/** The user's active sessions and when they last logged in. */
export async function listUserSessions(projectId: string, userId: string): Promise<UserSessions> {
  const params = { path: { user_id: userId } }
  const headers = projectHeaders(projectId)

  return dataOf(await apiClient.GET('/auth/v1/admin/users/{user_id}/sessions', { params, headers }))
}
