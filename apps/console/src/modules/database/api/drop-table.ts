import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

/** Drops the table and its rows; refused while another table references it. */
export async function dropTable(projectId: string, table: string): Promise<void> {
  const headers = projectHeaders(projectId)
  const params = { path: { table } }

  ensureSuccess(await apiClient.DELETE('/database/v1/tables/{table}', { headers, params }))
}
