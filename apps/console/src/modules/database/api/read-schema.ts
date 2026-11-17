import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type SchemaOverview = components['schemas']['SchemaOverview']

/** The tables (columns, keys, row level security, policies) and functions of `public`. */
export async function readSchema(projectId: string): Promise<SchemaOverview> {
  const headers = projectHeaders(projectId)

  return dataOf(await apiClient.GET('/database/v1/schema', { headers }))
}
