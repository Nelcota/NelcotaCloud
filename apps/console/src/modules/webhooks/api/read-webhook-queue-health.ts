import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type QueueHealth = components['schemas']['QueueHealth']

/** The project's delivery queue: what waits, what is late and what gave up in the last day. */
export async function readWebhookQueueHealth(projectId: string): Promise<QueueHealth> {
  const headers = projectHeaders(projectId)

  return dataOf(await apiClient.GET('/auth/v1/admin/webhooks/queue-health', { headers }))
}
