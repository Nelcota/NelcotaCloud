import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']

export type EmailKind = Schemas['AuthEmailKind']

export type EmailTemplateChange = { kind: EmailKind; text: Schemas['EmailTemplateText'] }

export async function saveEmailTemplate(
  projectId: string,
  { kind, text }: EmailTemplateChange,
): Promise<Schemas['EmailTemplateView']> {
  const options = { params: { path: { kind } }, headers: projectHeaders(projectId), body: text }

  return dataOf(await apiClient.PUT('/auth/v1/admin/email-templates/{kind}', options))
}
