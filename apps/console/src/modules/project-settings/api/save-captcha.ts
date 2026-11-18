import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']

/** Cloudflare checks the secret before it is stored. */
export async function saveCaptcha(
  projectId: string,
  body: Schemas['CaptchaSettingsBody'],
): Promise<Schemas['CaptchaSettingsView']> {
  const headers = projectHeaders(projectId)

  return dataOf(await apiClient.PUT('/auth/v1/admin/captcha', { headers, body }))
}
