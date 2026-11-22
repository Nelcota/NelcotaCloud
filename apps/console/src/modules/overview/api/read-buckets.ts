import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

/** The project's storage buckets, for the services list. */
export async function readBuckets(projectId: string): Promise<components['schemas']['Bucket'][]> {
  return dataOf(await apiClient.GET('/storage/v1/buckets', { headers: projectHeaders(projectId) }))
}
