import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type TenantSettings = components['schemas']['TenantSettings']

/** Name, site URL and email verification of the project. */
export async function readSettings(projectId: string): Promise<TenantSettings> {
  return dataOf(
    await apiClient.GET('/auth/v1/admin/settings', { headers: projectHeaders(projectId) }),
  )
}
