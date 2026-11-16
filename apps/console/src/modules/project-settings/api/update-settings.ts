import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type TenantSettings = components['schemas']['TenantSettings']
type TenantSettingsBody = components['schemas']['TenantSettingsBody']

/** Changes only the fields that are sent. */
export async function updateSettings(
  projectId: string,
  body: TenantSettingsBody,
): Promise<TenantSettings> {
  const headers = projectHeaders(projectId)

  return dataOf(await apiClient.PATCH('/auth/v1/admin/settings', { body, headers }))
}
