import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { listWebhookDeliveries } from '@/modules/webhooks/api/list-webhook-deliveries'
import {
  type DeliveryRef,
  retryWebhookDelivery,
} from '@/modules/webhooks/api/retry-webhook-delivery'
import { sendTestWebhook } from '@/modules/webhooks/api/send-test-webhook'
import { queueHealthKey } from '@/modules/webhooks/queries/use-webhook-queue-health'
import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']

/** Pending retries change on their own, so the log refreshes while it is open. */
const DELIVERY_LOG_REFRESH_MS = 10_000

function deliveriesKey(projectId: string, endpointId: string): readonly string[] {
  return ['projects', projectId, 'webhooks', endpointId, 'deliveries']
}

export function useWebhookDeliveriesQuery(
  projectId: string,
  endpointId: string,
): UseQueryResult<Schemas['DeliveryLogEntry'][]> {
  return useQuery({
    queryKey: deliveriesKey(projectId, endpointId),
    queryFn: () => listWebhookDeliveries(projectId, endpointId),
    refetchInterval: DELIVERY_LOG_REFRESH_MS,
  })
}

export function useRetryWebhookDeliveryMutation(
  projectId: string,
): UseMutationResult<void, Error, DeliveryRef> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (delivery: DeliveryRef) => retryWebhookDelivery(projectId, delivery),
    onSuccess: (_, delivery) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: deliveriesKey(projectId, delivery.endpointId) }),
        queryClient.invalidateQueries({ queryKey: queueHealthKey(projectId) }),
      ]),
  })
}

export function useTestWebhookMutation(
  projectId: string,
): UseMutationResult<Schemas['TestDeliveryResult'], Error, string> {
  return useMutation({
    mutationFn: (endpointId: string) => sendTestWebhook(projectId, endpointId),
  })
}
