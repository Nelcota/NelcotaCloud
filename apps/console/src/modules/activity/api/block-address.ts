import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']

export async function blockAddress(
  projectId: string,
  body: Schemas['BlockAddressBody'],
): Promise<Schemas['BlockedAddress']> {
  const headers = projectHeaders(projectId)

  return dataOf(await apiClient.POST('/auth/v1/admin/blocked-addresses', { body, headers }))
}
