import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type WebhookEndpointChangesBody = components['schemas']['WebhookEndpointChangesBody']
type WebhookEndpointView = components['schemas']['WebhookEndpointView']

export type WebhookEndpointUpdate = { endpointId: string; body: WebhookEndpointChangesBody }

export async function updateWebhookEndpoint(
  projectId: string,
  update: WebhookEndpointUpdate,
): Promise<WebhookEndpointView> {
  const headers = projectHeaders(projectId)
  const params = { path: { endpoint_id: update.endpointId } }
  const body = update.body

  return dataOf(
    await apiClient.PATCH('/auth/v1/admin/webhooks/{endpoint_id}', { body, headers, params }),
  )
}
