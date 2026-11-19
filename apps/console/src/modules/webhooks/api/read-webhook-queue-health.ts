import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

export async function readWebhookQueueHealth(
  projectId: string,
  signal: AbortSignal,
): Promise<components['schemas']['QueueHealth']> {
  const headers = projectHeaders(projectId)

  return dataOf(await apiClient.GET('/auth/v1/admin/webhooks/queue-health', { headers, signal }))
}
