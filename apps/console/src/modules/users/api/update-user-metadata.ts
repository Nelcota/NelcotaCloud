import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type User = components['schemas']['User']
type UpdateUserBody = components['schemas']['UpdateUserBody']

export type MetadataUpdate = { userId: string; body: UpdateUserBody }

/** Replaces the documents sent; the other is kept as it is. */
export async function updateUserMetadata(
  projectId: string,
  { userId, body }: MetadataUpdate,
): Promise<User> {
  const params = { path: { user_id: userId } }
  const headers = projectHeaders(projectId)

  return dataOf(await apiClient.PATCH('/auth/v1/admin/users/{user_id}', { params, headers, body }))
}
