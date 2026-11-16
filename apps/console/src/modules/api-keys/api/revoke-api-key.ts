import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

/** The key stops working at once. */
export async function revokeApiKey(projectId: string, keyId: string): Promise<void> {
  const params = { path: { key_id: keyId } }
  const headers = projectHeaders(projectId)
  ensureSuccess(await apiClient.DELETE('/auth/v1/admin/api-keys/{key_id}', { params, headers }))
}
