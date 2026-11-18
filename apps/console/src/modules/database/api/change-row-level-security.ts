import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

export type RowLevelSecurityChange = { table: string; isEnabled: boolean }

export async function changeRowLevelSecurity(
  projectId: string,
  change: RowLevelSecurityChange,
): Promise<void> {
  const headers = projectHeaders(projectId)
  const params = { path: { table: change.table } }
  const body = { rls_enabled: change.isEnabled }

  ensureSuccess(await apiClient.PATCH('/database/v1/tables/{table}', { body, headers, params }))
}
