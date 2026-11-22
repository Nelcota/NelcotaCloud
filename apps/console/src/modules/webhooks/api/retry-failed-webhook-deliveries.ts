import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type RequeuedDeliveries = components['schemas']['RequeuedDeliveries']

/** Sends every delivery of the endpoint that gave up again, right away. */
export async function retryFailedWebhookDeliveries(
  projectId: string,
  endpointId: string,
): Promise<RequeuedDeliveries> {
  const headers = projectHeaders(projectId)
  const params = { path: { endpoint_id: endpointId } }

  return dataOf(
    await apiClient.POST('/auth/v1/admin/webhooks/{endpoint_id}/deliveries/retry-failed', {
      headers,
      params,
    }),
  )
}
