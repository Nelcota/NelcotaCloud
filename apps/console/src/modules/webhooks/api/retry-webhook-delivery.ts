import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

export type DeliveryRef = { endpointId: string; deliveryId: string }

/** Queues the delivery again; it is sent within seconds. */
export async function retryWebhookDelivery(
  projectId: string,
  delivery: DeliveryRef,
): Promise<void> {
  const headers = projectHeaders(projectId)
  const params = { path: { endpoint_id: delivery.endpointId, delivery_id: delivery.deliveryId } }
  const path = '/auth/v1/admin/webhooks/{endpoint_id}/deliveries/{delivery_id}/retry'

  ensureSuccess(await apiClient.POST(path, { headers, params }))
}
