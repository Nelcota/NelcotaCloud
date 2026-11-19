import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type EmailTemplateView = components['schemas']['EmailTemplateView']

/** The wording of each auth email, the project's own or the default. */
export async function listEmailTemplates(projectId: string): Promise<EmailTemplateView[]> {
  const headers = projectHeaders(projectId)

  return dataOf(await apiClient.GET('/auth/v1/admin/email-templates', { headers }))
}
