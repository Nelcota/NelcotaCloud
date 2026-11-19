import { apiClient } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

export async function changeCacheSettings(projectId: string, enabled: boolean): Promise<void> {
  const params = { path: { project_id: projectId } }
  const response = await apiClient.PUT('/platform/v1/projects/{project_id}/cache', {
    params,
    body: { enabled },
  })
  ensureSuccess(response)
}
