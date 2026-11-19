import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf, ensureSuccess } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']

const PATH = '/auth/v1/admin/blocked-addresses'

/** Blocks in force, newest first. */
export async function listBlockedAddresses(
  projectId: string,
): Promise<Schemas['BlockedAddress'][]> {
  return dataOf(await apiClient.GET(PATH, { headers: projectHeaders(projectId) }))
}

/** Refuses logins, signups and emailed links from the address or range. */
export async function blockAddress(
  projectId: string,
  body: Schemas['BlockAddressBody'],
): Promise<Schemas['BlockedAddress']> {
  return dataOf(await apiClient.POST(PATH, { headers: projectHeaders(projectId), body }))
}

export async function unblockAddress(projectId: string, blockId: string): Promise<void> {
  const params = { path: { block_id: blockId } }

  ensureSuccess(
    await apiClient.DELETE(`${PATH}/{block_id}`, { headers: projectHeaders(projectId), params }),
  )
}
