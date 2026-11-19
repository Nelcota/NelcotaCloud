import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type SmtpSettingsBody = components['schemas']['SmtpSettingsBody']
type SmtpSettingsView = components['schemas']['SmtpSettingsView']

/** Auth emails go through the project's own SMTP server. */
export async function saveSmtp(
  projectId: string,
  body: SmtpSettingsBody,
): Promise<SmtpSettingsView> {
  const headers = projectHeaders(projectId)

  return dataOf(await apiClient.PUT('/auth/v1/admin/smtp', { body, headers }))
}
