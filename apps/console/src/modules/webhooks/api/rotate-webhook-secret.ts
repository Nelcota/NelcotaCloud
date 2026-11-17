import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type WebhookEndpointWithSecret = components['schemas']['WebhookEndpointWithSecret']

/** A new signing secret; the old one keeps signing for a day. */
export async function rotateWebhookSecret(
  projectId: string,
  endpointId: string,
): Promise<WebhookEndpointWithSecret> {
  const headers = projectHeaders(projectId)
  const params = { path: { endpoint_id: endpointId } }

  return dataOf(
    await apiClient.POST('/auth/v1/admin/webhooks/{endpoint_id}/secret', { headers, params }),
  )
}
