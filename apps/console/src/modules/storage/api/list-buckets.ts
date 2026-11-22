import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { StorageBucket } from './storage-types'

export async function listBuckets(
  projectId: string,
  signal: AbortSignal,
): Promise<StorageBucket[]> {
  return dataOf(
    await apiClient.GET('/storage/v1/buckets', { headers: projectHeaders(projectId), signal }),
  )
}
