import { apiClient } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

/** Takes a member's access to the project away (owners cannot be removed). */
export async function removeMember(projectId: string, accountId: string): Promise<void> {
  const params = { path: { project_id: projectId, account_id: accountId } }
  ensureSuccess(
    await apiClient.DELETE('/platform/v1/projects/{project_id}/members/{account_id}', { params }),
  )
}
