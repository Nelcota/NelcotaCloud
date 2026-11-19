import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

/** Logins and signups no longer need a captcha. */
export async function removeCaptcha(projectId: string): Promise<void> {
  ensureSuccess(
    await apiClient.DELETE('/auth/v1/admin/captcha', { headers: projectHeaders(projectId) }),
  )
}
