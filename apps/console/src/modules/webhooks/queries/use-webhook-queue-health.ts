import { type UseQueryResult, useQuery, useQueryClient } from '@tanstack/react-query'

import { readWebhookQueueHealth } from '@/modules/webhooks/api/read-webhook-queue-health'
import { type QueueReading, observeQueue } from '@/modules/webhooks/model/webhook-queue-health'
import { ApiError } from '@/shared/api/api-error'
import { useSession } from '@/shared/auth/use-session'

const REFRESH_MS = 30_000

export type QueueResult =
  | { kind: 'reading'; reading: QueueReading }
  | { kind: 'denied'; error: ApiError }

export type WebhookQueueQuery = UseQueryResult<QueueResult>

export function queueHealthKey(projectId: string): readonly string[] {
  return ['projects', projectId, 'webhook-queue-health']
}

export function useWebhookQueueHealth(projectId: string): WebhookQueueQuery {
  const session = useSession()
  const queryClient = useQueryClient()
  const queryKey = [...queueHealthKey(projectId), session?.user.id ?? null]

  return useQuery<QueueResult>({
    queryKey,
    enabled: session !== null,
    staleTime: 15_000,
    refetchInterval: (query) => refreshInterval(query.state.data),
    refetchIntervalInBackground: false,
    queryFn: async ({ signal }): Promise<QueueResult> => {
      try {
        const health = await readWebhookQueueHealth(projectId, signal)
        const previous = previousReading(queryClient.getQueryData<QueueResult>(queryKey))

        return { kind: 'reading', reading: observeQueue(health, previous) }
      } catch (error) {
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
          return { kind: 'denied', error }
        }

        throw error
      }
    },
  })
}

function previousReading(result: QueueResult | undefined): QueueReading | undefined {
  if (result?.kind === 'reading') {
    return result.reading
  }

  return undefined
}

function refreshInterval(result: QueueResult | undefined): number | false {
  if (result?.kind === 'denied') {
    return false
  }

  return REFRESH_MS
}
