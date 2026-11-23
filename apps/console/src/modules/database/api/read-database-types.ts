import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'

/** The generated `Database` TypeScript type of the project's `public` schema. */
export async function readDatabaseTypes(projectId: string): Promise<string> {
  const headers = projectHeaders(projectId)
  const types = dataOf(await apiClient.GET('/database/v1/types', { headers }))

  return types.typescript
}
