import type { EmailKind } from '@/modules/project-settings/api/save-email-template'
import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

/** Back to the platform's wording. */
export async function resetEmailTemplate(
  projectId: string,
  kind: EmailKind,
): Promise<components['schemas']['EmailTemplateView']> {
  const options = { params: { path: { kind } }, headers: projectHeaders(projectId) }

  return dataOf(await apiClient.DELETE('/auth/v1/admin/email-templates/{kind}', options))
}
