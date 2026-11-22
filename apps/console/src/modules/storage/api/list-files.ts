import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { StorageObjectPage } from './storage-types'

export async function listFiles(
  projectId: string,
  page: { bucketId: string; before: string | null },
  signal: AbortSignal,
): Promise<StorageObjectPage> {
  const { bucketId, before } = page

  return dataOf(
    await apiClient.GET('/storage/v1/buckets/{bucket_id}/objects', {
      signal,
      headers: projectHeaders(projectId),
      params: { path: { bucket_id: bucketId }, query: { before: before ?? undefined } },
    }),
  )
}
