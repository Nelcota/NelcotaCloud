import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type WebhookEndpointView = components['schemas']['WebhookEndpointView']

export async function listWebhookEndpoints(projectId: string): Promise<WebhookEndpointView[]> {
  const headers = projectHeaders(projectId)

  return dataOf(await apiClient.GET('/auth/v1/admin/webhooks', { headers }))
}
