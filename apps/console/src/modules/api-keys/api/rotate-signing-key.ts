import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type RotatedSigningKey = components['schemas']['RotatedSigningKey']

/** A new key signs access tokens; old tokens keep verifying until they expire. */
export async function rotateSigningKey(projectId: string): Promise<RotatedSigningKey> {
  const headers = projectHeaders(projectId)

  return dataOf(await apiClient.POST('/auth/v1/admin/signing-keys/rotate', { headers }))
}
