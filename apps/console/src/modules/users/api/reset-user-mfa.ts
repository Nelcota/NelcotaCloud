import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

/** Removes the user's authenticator (e.g. a lost phone). */
export async function resetUserMfa(projectId: string, userId: string): Promise<void> {
  const params = { path: { user_id: userId } }
  const headers = projectHeaders(projectId)
  ensureSuccess(await apiClient.DELETE('/auth/v1/admin/users/{user_id}/mfa', { params, headers }))
}
