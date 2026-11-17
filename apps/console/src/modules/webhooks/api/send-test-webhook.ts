import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type TestDeliveryResult = components['schemas']['TestDeliveryResult']

/** Sends a signed `webhook.test` event now and returns what the endpoint answered. */
export async function sendTestWebhook(
  projectId: string,
  endpointId: string,
): Promise<TestDeliveryResult> {
  const headers = projectHeaders(projectId)
  const params = { path: { endpoint_id: endpointId } }

  return dataOf(
    await apiClient.POST('/auth/v1/admin/webhooks/{endpoint_id}/test', { headers, params }),
  )
}
