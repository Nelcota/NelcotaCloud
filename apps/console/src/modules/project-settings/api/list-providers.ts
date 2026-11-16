import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type ConfiguredProvider = components['schemas']['ConfiguredProvider']

/** The providers the project has its own OAuth app for (client IDs only, never secrets). */
export async function listProviders(projectId: string): Promise<ConfiguredProvider[]> {
  const headers = projectHeaders(projectId)
  const body = dataOf(await apiClient.GET('/auth/v1/admin/oauth', { headers }))

  return body.providers
}
