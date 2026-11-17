import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type UserIdentities = components['schemas']['UserIdentities']

/** The social logins (Google, GitHub) linked to the user. */
export async function listUserIdentities(
  projectId: string,
  userId: string,
): Promise<UserIdentities> {
  const params = { path: { user_id: userId } }
  const headers = projectHeaders(projectId)

  return dataOf(
    await apiClient.GET('/auth/v1/admin/users/{user_id}/identities', { params, headers }),
  )
}
