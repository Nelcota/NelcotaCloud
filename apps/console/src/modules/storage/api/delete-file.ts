import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

export async function deleteFile(projectId: string, objectId: string): Promise<void> {
  ensureSuccess(
    await apiClient.DELETE('/storage/v1/objects/{object_id}', {
      headers: projectHeaders(projectId),
      params: { path: { object_id: objectId } },
    }),
  )
}
