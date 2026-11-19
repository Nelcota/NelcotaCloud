import { apiClient } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

export async function clearProjectCache(projectId: string): Promise<void> {
  const params = { path: { project_id: projectId } }
  ensureSuccess(await apiClient.POST('/platform/v1/projects/{project_id}/cache/clear', { params }))
}
