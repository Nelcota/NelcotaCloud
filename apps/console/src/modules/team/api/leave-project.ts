import { apiClient } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

/** The signed-in account leaves the project; an owner only while another owner stays. */
export async function leaveProject(projectId: string): Promise<void> {
  const params = { path: { project_id: projectId } }
  ensureSuccess(await apiClient.DELETE('/platform/v1/projects/{project_id}/membership', { params }))
}
