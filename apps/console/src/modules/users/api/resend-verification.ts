import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

/** Emails a new confirmation link to a user whose email is not confirmed yet. */
export async function resendVerification(projectId: string, userId: string): Promise<void> {
  const params = { path: { user_id: userId } }
  const headers = projectHeaders(projectId)
  ensureSuccess(
    await apiClient.POST('/auth/v1/admin/users/{user_id}/verification-email', {
      params,
      headers,
    }),
  )
}
