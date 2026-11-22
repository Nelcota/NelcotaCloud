import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type DeliveryLogEntry = components['schemas']['DeliveryLogEntry']

/** One state only, older than a delivery (the last of the previous page), or both. */
export type DeliveryLogPage = {
  status?: components['schemas']['DeliveryStatus']
  before?: string
}

/** The endpoint's deliveries, newest first, 50 at a time. */
export async function listWebhookDeliveries(
  projectId: string,
  endpointId: string,
  page: DeliveryLogPage = {},
): Promise<DeliveryLogEntry[]> {
  const headers = projectHeaders(projectId)
  const params = { path: { endpoint_id: endpointId }, query: page }

  return dataOf(
    await apiClient.GET('/auth/v1/admin/webhooks/{endpoint_id}/deliveries', { headers, params }),
  )
}
