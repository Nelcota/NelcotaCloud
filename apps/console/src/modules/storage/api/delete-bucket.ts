import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

export async function deleteBucket(projectId: string, bucketId: string): Promise<void> {
  ensureSuccess(
    await apiClient.DELETE('/storage/v1/buckets/{bucket_id}', {
      headers: projectHeaders(projectId),
      params: { path: { bucket_id: bucketId } },
    }),
  )
}
