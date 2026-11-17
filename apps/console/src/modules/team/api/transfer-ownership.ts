import { apiClient } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

/** Hands the project over: the member becomes an owner and the caller a member, at once. */
export async function transferOwnership(projectId: string, accountId: string): Promise<void> {
  const params = { path: { project_id: projectId } }
  ensureSuccess(
    await apiClient.POST('/platform/v1/projects/{project_id}/ownership-transfer', {
      params,
      body: { account_id: accountId },
    }),
  )
}
