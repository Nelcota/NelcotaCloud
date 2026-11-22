import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type TestDeliveryResult = components['schemas']['TestDeliveryResult']

/** Which endpoint, and the event type to imitate; `null` sends a plain `webhook.test`. */
export type TestSend = {
  endpointId: string
  eventType: components['schemas']['WebhookEventType'] | null
}

/** Sends a signed test event now and returns what the endpoint answered. */
export async function sendTestWebhook(
  projectId: string,
  send: TestSend,
): Promise<TestDeliveryResult> {
  const headers = projectHeaders(projectId)
  const params = { path: { endpoint_id: send.endpointId } }
  const body = { event_type: send.eventType }

  return dataOf(
    await apiClient.POST('/auth/v1/admin/webhooks/{endpoint_id}/test', { headers, params, body }),
  )
}
