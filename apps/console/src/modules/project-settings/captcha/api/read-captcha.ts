import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

/** The Turnstile site key, or `null` while the project asks for no captcha. */
export async function readCaptcha(
  projectId: string,
): Promise<components['schemas']['CaptchaSettingsView']> {
  return dataOf(
    await apiClient.GET('/auth/v1/admin/captcha', { headers: projectHeaders(projectId) }),
  )
}
