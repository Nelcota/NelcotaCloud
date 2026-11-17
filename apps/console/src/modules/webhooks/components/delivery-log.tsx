import type { JSX } from 'react'

import { DeliveryStatusBadge } from '@/modules/webhooks/components/delivery-status-badge'
import {
  useRetryWebhookDeliveryMutation,
  useWebhookDeliveriesQuery,
} from '@/modules/webhooks/queries/use-webhook-deliveries'
import type { components } from '@/shared/api/api-schema'
import { formatDateTime } from '@/shared/lib/format-date'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { Skeleton } from '@/shared/ui/skeleton'

type DeliveryLogEntry = components['schemas']['DeliveryLogEntry']

type DeliveryLogProps = { projectId: string; endpointId: string }

/** The endpoint's newest deliveries: what was sent, what the receiver answered, and resend. */
export function DeliveryLog({ projectId, endpointId }: DeliveryLogProps): JSX.Element {
  const deliveries = useWebhookDeliveriesQuery(projectId, endpointId)
  const retry = useRetryWebhookDeliveryMutation(projectId)

  if (deliveries.data === undefined) {
    return (
      <div className="grid gap-2">
        <ErrorAlert error={deliveries.error} />
        <Skeleton className="h-10 rounded-md" />
      </div>
    )
  }

  if (deliveries.data.length === 0) {
    return <p className="text-muted-foreground text-sm">Nenhum evento enviado ainda.</p>
  }

  return (
    <div className="grid gap-2">
      <ErrorAlert error={retry.error} />
      <ul className="divide-y rounded-lg border">
        {deliveries.data.map((delivery) => (
          <DeliveryRow
            key={delivery.id}
            delivery={delivery}
            isRetrying={retry.isPending}
            onRetry={() => retry.mutate({ endpointId, deliveryId: delivery.id })}
          />
        ))}
      </ul>
    </div>
  )
}

type DeliveryRowProps = {
  delivery: DeliveryLogEntry
  isRetrying: boolean
  onRetry: () => void
}

function DeliveryRow({ delivery, isRetrying, onRetry }: DeliveryRowProps): JSX.Element {
  return (
    <li className="flex flex-col gap-2 px-3 py-2.5 text-sm sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <DeliveryStatusBadge status={delivery.status} />
        <code className="font-mono text-xs">{delivery.event_type}</code>
        <span className="text-muted-foreground text-xs">{formatDateTime(delivery.created_at)}</span>
      </div>
      <span className="text-muted-foreground text-xs break-words">{attemptSummary(delivery)}</span>
      <Button variant="ghost" size="sm" disabled={isRetrying} onClick={onRetry}>
        Reenviar
      </Button>
    </li>
  )
}

/** The last answer, so owners see why a receiver is failing without opening their logs. */
function attemptSummary(delivery: DeliveryLogEntry): string {
  const attempts = `${delivery.attempts} ${pluralAttempts(delivery.attempts)}`
  const answer = lastAnswer(delivery)

  if (answer === null) {
    return attempts
  }

  return `${attempts} · ${answer}`
}

function lastAnswer(delivery: DeliveryLogEntry): string | null {
  if (delivery.last_error !== null && delivery.last_error !== undefined) {
    return delivery.last_error
  }

  if (delivery.last_response_status !== null && delivery.last_response_status !== undefined) {
    return `HTTP ${delivery.last_response_status}`
  }

  return null
}

function pluralAttempts(count: number): string {
  if (count === 1) {
    return 'tentativa'
  }

  return 'tentativas'
}
