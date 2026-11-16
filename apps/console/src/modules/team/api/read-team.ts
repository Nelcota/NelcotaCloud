import { apiClient } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type TeamView = components['schemas']['TeamView']

/** Who manages the project and who is invited; `can_manage` tells owners apart. */
export async function readTeam(projectId: string): Promise<TeamView> {
  const params = { path: { project_id: projectId } }

  return dataOf(await apiClient.GET('/platform/v1/projects/{project_id}/team', { params }))
}
