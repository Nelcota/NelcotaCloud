import { apiClient } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

/** Deletes the project, its users and its database (owners only). */
export async function deleteProject(projectId: string): Promise<void> {
  const params = { path: { project_id: projectId } }
  ensureSuccess(await apiClient.DELETE('/platform/v1/projects/{project_id}', { params }))
}
