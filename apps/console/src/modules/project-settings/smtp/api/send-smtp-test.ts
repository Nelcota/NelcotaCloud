import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

/** Sends a test email through the project's own SMTP server and waits for it to accept it. */
export async function sendSmtpTest(projectId: string, to: string): Promise<void> {
  const headers = projectHeaders(projectId)
  const body = { to }
  ensureSuccess(await apiClient.POST('/auth/v1/admin/smtp/test', { body, headers }))
}
