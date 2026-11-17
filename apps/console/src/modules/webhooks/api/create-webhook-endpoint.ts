import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type WebhookEndpointBody = components['schemas']['WebhookEndpointBody']
type WebhookEndpointWithSecret = components['schemas']['WebhookEndpointWithSecret']

/** The answer carries the signing secret: the only time the API returns it. */
export async function createWebhookEndpoint(
  projectId: string,
  body: WebhookEndpointBody,
): Promise<WebhookEndpointWithSecret> {
  const headers = projectHeaders(projectId)

  return dataOf(await apiClient.POST('/auth/v1/admin/webhooks', { body, headers }))
}
