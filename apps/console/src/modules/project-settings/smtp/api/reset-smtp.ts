import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

/** Auth emails go through the platform's SMTP server again. */
export async function resetSmtp(projectId: string): Promise<void> {
  ensureSuccess(
    await apiClient.DELETE('/auth/v1/admin/smtp', { headers: projectHeaders(projectId) }),
  )
}
