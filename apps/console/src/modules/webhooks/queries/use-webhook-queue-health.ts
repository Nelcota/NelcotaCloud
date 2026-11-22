import { type UseQueryResult, useQuery } from '@tanstack/react-query'

import { readWebhookQueueHealth } from '@/modules/webhooks/api/read-webhook-queue-health'
import type { components } from '@/shared/api/api-schema'

/** The queue moves on its own (retries, the worker), so its figures refresh while shown. */
const QUEUE_REFRESH_MS = 15_000

export function useWebhookQueueHealthQuery(
  projectId: string,
): UseQueryResult<components['schemas']['QueueHealth']> {
  return useQuery({
    queryKey: ['projects', projectId, 'webhooks', 'queue-health'],
    queryFn: () => readWebhookQueueHealth(projectId),
    refetchInterval: QUEUE_REFRESH_MS,
  })
}
