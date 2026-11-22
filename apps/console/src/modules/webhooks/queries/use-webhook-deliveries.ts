import {
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseMutationResult,
  type UseQueryResult,
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { listWebhookDeliveries } from '@/modules/webhooks/api/list-webhook-deliveries'
import { retryFailedWebhookDeliveries } from '@/modules/webhooks/api/retry-failed-webhook-deliveries'
import {
  type DeliveryRef,
  retryWebhookDelivery,
} from '@/modules/webhooks/api/retry-webhook-delivery'
import { type TestSend, sendTestWebhook } from '@/modules/webhooks/api/send-test-webhook'
import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']
type DeliveryLogEntry = Schemas['DeliveryLogEntry']

/** Pending retries change on their own, so an open endpoint refreshes every few seconds. */
const DELIVERY_LOG_REFRESH_MS = 10_000
/** The endpoints table refreshes too, more calmly: it shows a glance, not a log. */
const ENDPOINT_LIST_REFRESH_MS = 30_000
/** The API's page size; a shorter page is the last one. */
const PAGE_SIZE = 50

function deliveriesKey(projectId: string, endpointId: string): readonly string[] {
  return ['projects', projectId, 'webhooks', endpointId, 'deliveries']
}

/** The 50 newest deliveries, whatever their state: the strip and the health read them. */
export function useWebhookDeliveriesQuery(
  projectId: string,
  endpointId: string,
): UseQueryResult<DeliveryLogEntry[]> {
  return useQuery({
    queryKey: deliveriesKey(projectId, endpointId),
    queryFn: () => listWebhookDeliveries(projectId, endpointId),
    refetchInterval: DELIVERY_LOG_REFRESH_MS,
  })
}

/** The same newest deliveries, for the endpoints table, on its calmer refresh. */
export function useRecentDeliveriesQuery(
  projectId: string,
  endpointId: string,
): UseQueryResult<DeliveryLogEntry[]> {
  return useQuery({
    queryKey: deliveriesKey(projectId, endpointId),
    queryFn: () => listWebhookDeliveries(projectId, endpointId),
    refetchInterval: ENDPOINT_LIST_REFRESH_MS,
  })
}

type LogScope = { projectId: string; endpointId: string; status: Schemas['DeliveryStatus'] | null }

/** The log, filtered by the API, 50 at a time; `fetchNextPage` reads older deliveries. */
export function useDeliveryLogQuery(
  scope: LogScope,
): UseInfiniteQueryResult<InfiniteData<DeliveryLogEntry[], string | undefined>> {
  const { projectId, endpointId, status } = scope

  return useInfiniteQuery({
    queryKey: [...deliveriesKey(projectId, endpointId), 'log', status ?? 'all'],
    queryFn: ({ pageParam }) =>
      listWebhookDeliveries(projectId, endpointId, {
        status: status ?? undefined,
        before: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: nextBefore,
    refetchInterval: DELIVERY_LOG_REFRESH_MS,
    placeholderData: keepPreviousData,
  })
}

function nextBefore(lastPage: DeliveryLogEntry[]): string | undefined {
  if (lastPage.length < PAGE_SIZE) {
    return undefined
  }

  return lastPage.at(-1)?.id
}

export function useRetryWebhookDeliveryMutation(
  projectId: string,
): UseMutationResult<void, Error, DeliveryRef> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (delivery: DeliveryRef) => retryWebhookDelivery(projectId, delivery),
    onSuccess: (_, delivery) =>
      queryClient.invalidateQueries({ queryKey: deliveriesKey(projectId, delivery.endpointId) }),
  })
}

export function useRetryFailedDeliveriesMutation(
  projectId: string,
): UseMutationResult<Schemas['RequeuedDeliveries'], Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (endpointId: string) => retryFailedWebhookDeliveries(projectId, endpointId),
    onSuccess: (_, endpointId) =>
      queryClient.invalidateQueries({ queryKey: deliveriesKey(projectId, endpointId) }),
  })
}

export function useTestWebhookMutation(
  projectId: string,
): UseMutationResult<Schemas['TestDeliveryResult'], Error, TestSend> {
  return useMutation({
    mutationFn: (send: TestSend) => sendTestWebhook(projectId, send),
  })
}
