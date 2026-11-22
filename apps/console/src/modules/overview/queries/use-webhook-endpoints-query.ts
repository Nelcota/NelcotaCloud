import { type UseQueryResult, useQuery } from '@tanstack/react-query'

import { readWebhookEndpoints } from '@/modules/overview/api/read-webhook-endpoints'
import { webhookEndpointsKey } from '@/modules/webhooks/queries/use-webhook-endpoints'
import type { components } from '@/shared/api/api-schema'

export function useWebhookEndpointsQuery(
  projectId: string,
): UseQueryResult<components['schemas']['WebhookEndpointView'][]> {
  return useQuery({
    // Under the webhooks module's key, so its changes refresh this copy too.
    queryKey: [...webhookEndpointsKey(projectId), 'overview'],
    queryFn: () => readWebhookEndpoints(projectId),
  })
}
