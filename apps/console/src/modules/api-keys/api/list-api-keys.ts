import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type ApiKeySummary = components['schemas']['ApiKeySummary']

export type ApiKeyPage = { keys: ApiKeySummary[]; nextCursor: string | null }

/** Active keys on the first page, followed by pages of revoked keys. */
export async function listApiKeys(projectId: string, before: string | null): Promise<ApiKeyPage> {
  const result = await apiClient.GET('/auth/v1/admin/api-keys', {
    headers: projectHeaders(projectId),
    params: { query: { before: before ?? undefined } },
  })

  return {
    keys: dataOf(result),
    nextCursor: result.response.headers.get('x-nelcota-next-cursor'),
  }
}
