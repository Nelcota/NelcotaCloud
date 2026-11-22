import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

/** The blocks in force, refusing logins, signups and emailed links from those addresses. */
export async function listBlockedAddresses(
  projectId: string,
): Promise<components['schemas']['BlockedAddress'][]> {
  const headers = projectHeaders(projectId)

  return dataOf(await apiClient.GET('/auth/v1/admin/blocked-addresses', { headers }))
}
