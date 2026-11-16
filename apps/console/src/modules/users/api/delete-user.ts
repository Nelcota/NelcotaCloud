import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

/** Removes the user with their identities and sessions. */
export async function deleteUser(projectId: string, userId: string): Promise<void> {
  const params = { path: { user_id: userId } }
  const headers = projectHeaders(projectId)
  ensureSuccess(await apiClient.DELETE('/auth/v1/admin/users/{user_id}', { params, headers }))
}
