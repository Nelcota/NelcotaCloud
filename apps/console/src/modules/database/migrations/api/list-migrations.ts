import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

export type MigrationHistory = components['schemas']['MigrationHistory']

export async function listMigrations(
  projectId: string,
  before?: number,
): Promise<MigrationHistory> {
  const headers = projectHeaders(projectId)

  return dataOf(
    await apiClient.GET('/database/v1/migrations', { headers, params: { query: { before } } }),
  )
}
