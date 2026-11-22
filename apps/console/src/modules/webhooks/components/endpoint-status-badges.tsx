import type { JSX } from 'react'

import { summarizeDeliveries } from '@/modules/webhooks/components/delivery-summary'
import { HEALTH, healthKindOf } from '@/modules/webhooks/components/endpoint-health-state'
import type { WebhookEndpoint } from '@/modules/webhooks/components/endpoint-panel-types'
import { useWebhookDeliveriesQuery } from '@/modules/webhooks/queries/use-webhook-deliveries'
import { StatusBadge } from '@/shared/ui/status-badge'

type EndpointStatusBadgesProps = { projectId: string; endpoint: WebhookEndpoint }

/** Active or paused, and, while active, how its deliveries are going. */
export function EndpointStatusBadges({
  projectId,
  endpoint,
}: EndpointStatusBadgesProps): JSX.Element {
  if (endpoint.is_enabled === false) {
    return <StatusBadge>Pausado</StatusBadge>
  }

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <StatusBadge tone="success">Ativo</StatusBadge>
      <HealthBadge projectId={projectId} endpoint={endpoint} />
    </span>
  )
}

function HealthBadge({ projectId, endpoint }: EndpointStatusBadgesProps): JSX.Element | null {
  const deliveries = useWebhookDeliveriesQuery(projectId, endpoint.id)
  const data = deliveries.data

  if (data === undefined) {
    return null
  }

  const summary = summarizeDeliveries(data, deliveries.dataUpdatedAt)
  const health = HEALTH[healthKindOf(endpoint.is_enabled, summary)]

  return <StatusBadge tone={health.badgeTone}>{health.label}</StatusBadge>
}
