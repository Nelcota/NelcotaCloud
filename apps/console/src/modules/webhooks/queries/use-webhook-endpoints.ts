import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { deleteWebhookEndpoint } from '@/modules/webhooks/api/delete-webhook-endpoint'
import { listWebhookEndpoints } from '@/modules/webhooks/api/list-webhook-endpoints'
import { queueHealthKey } from '@/modules/webhooks/queries/use-webhook-queue-health'
import {
  type WebhookEndpointUpdate,
  updateWebhookEndpoint,
} from '@/modules/webhooks/api/update-webhook-endpoint'
import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']

export function webhookEndpointsKey(projectId: string): readonly string[] {
  return ['projects', projectId, 'webhooks']
}

export function useWebhookEndpointsQuery(
  projectId: string,
): UseQueryResult<Schemas['WebhookEndpointView'][]> {
  return useQuery({
    queryKey: webhookEndpointsKey(projectId),
    queryFn: () => listWebhookEndpoints(projectId),
  })
}

export function useUpdateWebhookEndpointMutation(
  projectId: string,
): UseMutationResult<Schemas['WebhookEndpointView'], Error, WebhookEndpointUpdate> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (update: WebhookEndpointUpdate) => updateWebhookEndpoint(projectId, update),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: webhookEndpointsKey(projectId) }),
        queryClient.invalidateQueries({ queryKey: queueHealthKey(projectId) }),
      ]),
  })
}

export function useDeleteWebhookEndpointMutation(
  projectId: string,
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (endpointId: string) => deleteWebhookEndpoint(projectId, endpointId),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: webhookEndpointsKey(projectId) }),
        queryClient.invalidateQueries({ queryKey: queueHealthKey(projectId) }),
      ]),
  })
}
