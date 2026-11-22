import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

export async function unblockAddress(projectId: string, blockId: string): Promise<void> {
  const headers = projectHeaders(projectId)
  const path = { block_id: blockId }

  ensureSuccess(
    await apiClient.DELETE('/auth/v1/admin/blocked-addresses/{block_id}', {
      params: { path },
      headers,
    }),
  )
}
