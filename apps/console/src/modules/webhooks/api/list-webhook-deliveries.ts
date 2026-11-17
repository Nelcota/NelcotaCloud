import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type DeliveryLogEntry = components['schemas']['DeliveryLogEntry']

/** The endpoint's 50 newest deliveries. */
export async function listWebhookDeliveries(
  projectId: string,
  endpointId: string,
): Promise<DeliveryLogEntry[]> {
  const headers = projectHeaders(projectId)
  const params = { path: { endpoint_id: endpointId } }

  return dataOf(
    await apiClient.GET('/auth/v1/admin/webhooks/{endpoint_id}/deliveries', { headers, params }),
  )
}
