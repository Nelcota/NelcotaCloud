import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

/** The project's webhook endpoints, for the services list. */
export async function readWebhookEndpoints(
  projectId: string,
): Promise<components['schemas']['WebhookEndpointView'][]> {
  return dataOf(
    await apiClient.GET('/auth/v1/admin/webhooks', { headers: projectHeaders(projectId) }),
  )
}
