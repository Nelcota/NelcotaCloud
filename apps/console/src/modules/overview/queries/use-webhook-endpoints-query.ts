import { type UseQueryResult, useQuery } from '@tanstack/react-query'

import { readWebhookEndpoints } from '@/modules/overview/api/read-webhook-endpoints'
import type { components } from '@/shared/api/api-schema'

export function useWebhookEndpointsQuery(
  projectId: string,
): UseQueryResult<components['schemas']['WebhookEndpointView'][]> {
  return useQuery({
    queryKey: ['projects', projectId, 'overview', 'webhooks'],
    queryFn: () => readWebhookEndpoints(projectId),
  })
}
