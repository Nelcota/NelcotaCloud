import type { JSX } from 'react'

import { summarizeDeliveries } from '@/modules/webhooks/components/delivery-summary'
import { healthSentence } from '@/modules/webhooks/components/endpoint-health-sentence'
import {
  HEALTH,
  type HealthAction,
  healthKindOf,
} from '@/modules/webhooks/components/endpoint-health-state'
import type { WebhookEndpoint } from '@/modules/webhooks/components/endpoint-panel-types'
import { useWebhookDeliveriesQuery } from '@/modules/webhooks/queries/use-webhook-deliveries'
import { LoadError } from '@/shared/ui/load-error'
import { PendingButton } from '@/shared/ui/pending-button'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { SummarySentence } from '@/shared/ui/summary-sentence'

type EndpointHealthProps = {
  projectId: string
  endpoint: WebhookEndpoint
  /** True while the action's own request runs (a test send, resuming). */
  isActing: boolean
  onAction: (action: HealthAction) => void
}

/** Whether this endpoint is delivering, in one sentence, with the step that fits it. */
export function EndpointHealth(props: EndpointHealthProps): JSX.Element {
  const deliveries = useWebhookDeliveriesQuery(props.projectId, props.endpoint.id)

  if (deliveries.data === undefined && deliveries.isError) {
    return <LoadError error={deliveries.error} onRetry={() => deliveries.refetch()} />
  }

  if (deliveries.data === undefined) {
    return <Skeleton className="h-12 rounded-xl" />
  }

  const loadedAt = deliveries.dataUpdatedAt
  const summary = summarizeDeliveries(deliveries.data, loadedAt)
  const kind = healthKindOf(props.endpoint.is_enabled, summary)
  const health = HEALTH[kind]

  return (
    <SummarySentence
      tone={health.tone}
      verdict={health.verdict}
      action={
        <PendingButton
          type="button"
          size="sm"
          variant="outline"
          isPending={props.isActing}
          onClick={() => props.onAction(health.action)}
        >
          {health.actionLabel}
        </PendingButton>
      }
    >
      <span className="tabular-nums">{healthSentence(kind, summary, loadedAt)}</span>
    </SummarySentence>
  )
}
