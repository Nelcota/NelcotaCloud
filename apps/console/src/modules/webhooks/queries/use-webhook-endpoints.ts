import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { createWebhookEndpoint } from '@/modules/webhooks/api/create-webhook-endpoint'
import { deleteWebhookEndpoint } from '@/modules/webhooks/api/delete-webhook-endpoint'
import { listWebhookEndpoints } from '@/modules/webhooks/api/list-webhook-endpoints'
import { rotateWebhookSecret } from '@/modules/webhooks/api/rotate-webhook-secret'
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

export function useCreateWebhookEndpointMutation(
  projectId: string,
): UseMutationResult<Schemas['WebhookEndpointWithSecret'], Error, Schemas['WebhookEndpointBody']> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: Schemas['WebhookEndpointBody']) => createWebhookEndpoint(projectId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: webhookEndpointsKey(projectId) }),
  })
}

export function useUpdateWebhookEndpointMutation(
  projectId: string,
): UseMutationResult<Schemas['WebhookEndpointView'], Error, WebhookEndpointUpdate> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (update: WebhookEndpointUpdate) => updateWebhookEndpoint(projectId, update),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: webhookEndpointsKey(projectId) }),
  })
}

export function useDeleteWebhookEndpointMutation(
  projectId: string,
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (endpointId: string) => deleteWebhookEndpoint(projectId, endpointId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: webhookEndpointsKey(projectId) }),
  })
}

export function useRotateWebhookSecretMutation(
  projectId: string,
): UseMutationResult<Schemas['WebhookEndpointWithSecret'], Error, string> {
  return useMutation({
    mutationFn: (endpointId: string) => rotateWebhookSecret(projectId, endpointId),
  })
}
