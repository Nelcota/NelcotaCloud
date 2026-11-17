import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type SqlResult = components['schemas']['SqlResult']

/** Runs the statements in one transaction, for up to 15 seconds; answers the last result set. */
export async function runSql(projectId: string, query: string): Promise<SqlResult> {
  const headers = projectHeaders(projectId)
  const body = { query }

  return dataOf(await apiClient.POST('/database/v1/sql', { body, headers }))
}
