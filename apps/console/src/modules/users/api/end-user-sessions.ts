import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

/** Ends every session of the user. */
export async function endUserSessions(projectId: string, userId: string): Promise<void> {
  const params = { path: { user_id: userId } }
  const headers = projectHeaders(projectId)
  ensureSuccess(await apiClient.POST('/auth/v1/admin/users/{user_id}/logout', { params, headers }))
}
