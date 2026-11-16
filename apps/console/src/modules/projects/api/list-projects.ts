import { apiClient } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type ProjectSummary = components['schemas']['ProjectSummary']

/** The console account's projects, newest first. */
export async function listProjects(): Promise<ProjectSummary[]> {
  return dataOf(await apiClient.GET('/platform/v1/projects'))
}
