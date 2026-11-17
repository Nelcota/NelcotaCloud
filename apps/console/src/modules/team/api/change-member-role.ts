import { apiClient } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type ProjectRole = components['schemas']['ProjectRole']

/** Makes a member an owner, or an owner a member; the project always keeps one owner. */
export async function changeMemberRole(
  projectId: string,
  accountId: string,
  role: ProjectRole,
): Promise<void> {
  const params = { path: { project_id: projectId, account_id: accountId } }
  ensureSuccess(
    await apiClient.PATCH('/platform/v1/projects/{project_id}/members/{account_id}', {
      params,
      body: { role },
    }),
  )
}
