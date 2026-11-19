import { apiClient } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type IssuedCacheCredential = components['schemas']['IssuedCacheCredential']

export async function createCacheCredential(
  projectId: string,
  name: string,
): Promise<IssuedCacheCredential> {
  const params = { path: { project_id: projectId } }
  const response = await apiClient.POST('/platform/v1/projects/{project_id}/cache/credentials', {
    params,
    body: { name },
  })

  return dataOf(response)
}
