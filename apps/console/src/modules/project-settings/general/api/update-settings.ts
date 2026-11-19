import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ApiError } from '@/shared/api/api-error'
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
  const result = await apiClient.PATCH('/auth/v1/admin/settings', { body, headers })
  const settings = dataOf(result)

  if (typeof body.mascot_id === 'number' && settings.mascot_id !== body.mascot_id) {
    throw new ApiError({
      status: result.response.status,
      code: 'mascot_save_unconfirmed',
      message: 'The API did not confirm the selected mascot.',
    })
  }

  return settings
}
