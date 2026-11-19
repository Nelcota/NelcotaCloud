import { apiClient } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type ProjectCacheSettings = components['schemas']['ProjectCacheSettings']

export async function readCacheSettings(projectId: string): Promise<ProjectCacheSettings> {
  const params = { path: { project_id: projectId } }

  return dataOf(await apiClient.GET('/platform/v1/projects/{project_id}/cache', { params }))
}
