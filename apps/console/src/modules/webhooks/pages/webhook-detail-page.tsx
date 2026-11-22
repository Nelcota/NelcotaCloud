import { useParams } from '@tanstack/react-router'
import type { JSX } from 'react'

import { EndpointDetail } from '@/modules/webhooks/components/endpoint-detail'
import {
  EndpointLoading,
  EndpointNotFound,
} from '@/modules/webhooks/components/endpoint-detail-states'
import { useWebhookEndpointsQuery } from '@/modules/webhooks/queries/use-webhook-endpoints'

export function WebhookDetailPage(): JSX.Element {
  const { projectId, endpointId } = useParams({
    from: '/_authenticated/projects/$projectId/webhooks/$endpointId',
  })
  const endpoints = useWebhookEndpointsQuery(projectId)

  if (endpoints.data === undefined) {
    return <EndpointLoading error={endpoints.error} onRetry={() => endpoints.refetch()} />
  }

  const endpoint = endpoints.data.find((candidate) => candidate.id === endpointId)

  if (endpoint === undefined) {
    return <EndpointNotFound projectId={projectId} />
  }

  return <EndpointDetail key={endpoint.id} projectId={projectId} endpoint={endpoint} />
}
