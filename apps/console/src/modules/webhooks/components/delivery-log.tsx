import type { JSX } from 'react'

import { DeliveryFeed } from '@/modules/webhooks/components/delivery-feed'
import {
  DELIVERY_FILTERS,
  type DeliveryFilter,
  filterDeliveries,
  parseDeliveryFilter,
} from '@/modules/webhooks/components/delivery-filter'
import { RequestErrorNotice } from '@/modules/webhooks/components/request-error-notice'
import {
  useRetryWebhookDeliveryMutation,
  useWebhookDeliveriesQuery,
} from '@/modules/webhooks/queries/use-webhook-deliveries'
import { formatCount } from '@/shared/lib/format-number'
import { EmptyState } from '@/shared/ui/empty-state'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { SegmentedControl } from '@/shared/ui/segmented-control'

const SKELETON_ROWS = ['first', 'second', 'third', 'fourth']

type DeliveryLogProps = {
  projectId: string
  endpointId: string
  filter: { value: DeliveryFilter; onChange: (filter: DeliveryFilter) => void }
}

/** The newest deliveries as a feed, filtered on the loaded window; each opens its details. */
export function DeliveryLog({ projectId, endpointId, filter }: DeliveryLogProps): JSX.Element {
  const deliveries = useWebhookDeliveriesQuery(projectId, endpointId)
  const retry = useRetryWebhookDeliveryMutation(projectId)

  if (deliveries.data === undefined && deliveries.isError) {
    return <LoadError error={deliveries.error} onRetry={() => deliveries.refetch()} />
  }

  if (deliveries.data === undefined) {
    return <FeedSkeleton />
  }

  if (deliveries.data.length === 0) {
    return (
      <EmptyState title="As entregas aparecem aqui quando um evento acontece." isCompact isFramed />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground tabular-nums">
          Últimas {formatCount(deliveries.data.length)} entregas
        </p>
        <SegmentedControl
          label="Filtrar entregas"
          options={DELIVERY_FILTERS}
          value={filter.value}
          onValueChange={(value) => filter.onChange(parseDeliveryFilter(value))}
        />
      </div>
      <RequestErrorNotice error={retry.error} />
      <DeliveryFeed
        deliveries={filterDeliveries(deliveries.data, filter.value)}
        filter={filter.value}
        loadedAt={deliveries.dataUpdatedAt}
        retry={{
          retryingId: retryingIdOf(retry.isPending, retry.variables?.deliveryId),
          onRetry: (deliveryId) => retry.mutate({ endpointId, deliveryId }),
        }}
      />
    </div>
  )
}

function FeedSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      {SKELETON_ROWS.map((row) => (
        <Skeleton key={row} className="h-11 rounded-lg" />
      ))}
    </div>
  )
}

function retryingIdOf(isPending: boolean, deliveryId: string | undefined): string | null {
  if (isPending === false || deliveryId === undefined) {
    return null
  }

  return deliveryId
}
