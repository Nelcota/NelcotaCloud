import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

/** Where a test email goes and, for settings not saved yet, the server to try. */
export type SmtpTestRequest = {
  to: string
  server?: components['schemas']['SmtpSettingsBody']
}

/**
 * Sends a test email through the project's own SMTP server (or the unsaved one given) and waits
 * for it to accept it.
 */
export async function sendSmtpTest(projectId: string, body: SmtpTestRequest): Promise<void> {
  const headers = projectHeaders(projectId)
  ensureSuccess(await apiClient.POST('/auth/v1/admin/smtp/test', { body, headers }))
}
