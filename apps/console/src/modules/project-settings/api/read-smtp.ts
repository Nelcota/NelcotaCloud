import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type SmtpSettingsView = components['schemas']['SmtpSettingsView']

/** Where the project's auth emails are sent from. */
export async function readSmtp(projectId: string): Promise<SmtpSettingsView> {
  return dataOf(await apiClient.GET('/auth/v1/admin/smtp', { headers: projectHeaders(projectId) }))
}
