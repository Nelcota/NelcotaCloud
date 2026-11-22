import type { JSX } from 'react'

import { DeliverySummaryLine } from '@/modules/webhooks/components/delivery-summary-line'
import { summarizeDeliveries } from '@/modules/webhooks/components/delivery-summary'
import { type HealthAction, healthOf } from '@/modules/webhooks/components/endpoint-health-state'
import type { WebhookEndpoint } from '@/modules/webhooks/components/endpoint-panel-types'
import { useWebhookDeliveriesQuery } from '@/modules/webhooks/queries/use-webhook-deliveries'
import { cn } from '@/shared/lib/utils'
import { LoadError } from '@/shared/ui/load-error'
import { PendingButton } from '@/shared/ui/pending-button'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import type { StatusTone } from '@/shared/ui/status-badge'

const DOT_COLORS: Record<StatusTone, string> = {
  neutral: 'bg-muted-foreground',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-destructive',
  info: 'bg-info',
  brand: 'bg-primary',
}

type EndpointHealthProps = {
  projectId: string
  endpoint: WebhookEndpoint
  /** True while the action's own request runs (a test send, resuming). */
  isActing: boolean
  onAction: (action: HealthAction) => void
}

/** The panel's headline: whether this endpoint is delivering, in one large line, and what to do. */
export function EndpointHealth(props: EndpointHealthProps): JSX.Element {
  const deliveries = useWebhookDeliveriesQuery(props.projectId, props.endpoint.id)

  if (deliveries.data === undefined && deliveries.isError) {
    return <LoadError error={deliveries.error} onRetry={() => deliveries.refetch()} />
  }

  if (deliveries.data === undefined) {
    return <Skeleton className="h-24 rounded-xl" />
  }

  const summary = summarizeDeliveries(deliveries.data, deliveries.dataUpdatedAt)
  const health = healthOf(props.endpoint.is_enabled, summary)

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid min-w-0 gap-2">
        <p
          role="status"
          className="flex items-start gap-3 text-2xl font-semibold tracking-tight text-heading sm:text-3xl"
        >
          <span
            aria-hidden
            className={cn('mt-[0.4em] size-3 shrink-0 rounded-full', DOT_COLORS[health.tone])}
          />
          {health.title}
        </p>
        <DeliverySummaryLine summary={summary} />
      </div>
      <PendingButton
        type="button"
        className="self-start sm:self-auto"
        isPending={props.isActing}
        onClick={() => props.onAction(health.action)}
      >
        {health.actionLabel}
      </PendingButton>
    </div>
  )
}
