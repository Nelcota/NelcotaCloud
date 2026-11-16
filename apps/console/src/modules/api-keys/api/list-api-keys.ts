import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type ApiKeySummary = components['schemas']['ApiKeySummary']

/** Every key of the project, newest first, without the keys themselves. */
export async function listApiKeys(projectId: string): Promise<ApiKeySummary[]> {
  return dataOf(
    await apiClient.GET('/auth/v1/admin/api-keys', { headers: projectHeaders(projectId) }),
  )
}
