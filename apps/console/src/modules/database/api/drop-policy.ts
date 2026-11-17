import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

export type PolicyRef = { table: string; policy: string }

export async function dropPolicy(projectId: string, ref: PolicyRef): Promise<void> {
  const headers = projectHeaders(projectId)
  const params = { path: { table: ref.table, policy: ref.policy } }
  const path = '/database/v1/tables/{table}/policies/{policy}'

  ensureSuccess(await apiClient.DELETE(path, { headers, params }))
}
