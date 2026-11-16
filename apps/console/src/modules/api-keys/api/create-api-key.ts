import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type CreateApiKeyBody = components['schemas']['CreateApiKeyBody']
type IssuedApiKey = components['schemas']['IssuedApiKey']

/** A new key; its value comes back only here. */
export async function createApiKey(
  projectId: string,
  body: CreateApiKeyBody,
): Promise<IssuedApiKey> {
  const headers = projectHeaders(projectId)

  return dataOf(await apiClient.POST('/auth/v1/admin/api-keys', { body, headers }))
}
