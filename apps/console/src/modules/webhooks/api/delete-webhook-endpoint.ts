import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

export async function deleteWebhookEndpoint(projectId: string, endpointId: string): Promise<void> {
  const headers = projectHeaders(projectId)
  const params = { path: { endpoint_id: endpointId } }

  ensureSuccess(
    await apiClient.DELETE('/auth/v1/admin/webhooks/{endpoint_id}', { headers, params }),
  )
}
