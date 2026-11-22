import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { StorageBucket } from './storage-types'

export async function createBucket(projectId: string, name: string): Promise<StorageBucket> {
  return dataOf(
    await apiClient.POST('/storage/v1/buckets', {
      headers: projectHeaders(projectId),
      body: { name },
    }),
  )
}
