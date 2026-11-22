import type { JSX } from 'react'

import {
  DELIVERY_FILTERS,
  type DeliveryFilter,
  filterDeliveries,
  parseDeliveryFilter,
} from '@/modules/webhooks/components/delivery-filter'
import { DeliveryTable } from '@/modules/webhooks/components/delivery-table'
import { RequestErrorNotice } from '@/modules/webhooks/components/request-error-notice'
import {
  useRetryWebhookDeliveryMutation,
  useWebhookDeliveriesQuery,
} from '@/modules/webhooks/queries/use-webhook-deliveries'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { SegmentedControl } from '@/shared/ui/segmented-control'

type DeliveryLogProps = {
  projectId: string
  endpointId: string
  filter: { value: DeliveryFilter; onChange: (filter: DeliveryFilter) => void }
}

/** The newest deliveries as rows to scan, filtered on the loaded window; each opens its details. */
export function DeliveryLog({ projectId, endpointId, filter }: DeliveryLogProps): JSX.Element {
  const deliveries = useWebhookDeliveriesQuery(projectId, endpointId)
  const retry = useRetryWebhookDeliveryMutation(projectId)

  if (deliveries.data === undefined && deliveries.isError) {
    return (
      <div className="p-5 sm:p-6">
        <LoadError error={deliveries.error} onRetry={() => deliveries.refetch()} />
      </div>
    )
  }

  if (deliveries.data === undefined) {
    return <Skeleton className="m-5 h-40 rounded-xl sm:m-6" />
  }

  if (deliveries.data.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-sm text-muted-foreground sm:px-6">
        As entregas aparecem aqui quando um evento acontece.
      </p>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-3 sm:px-6">
        <p className="text-sm text-muted-foreground tabular-nums">
          Últimas {deliveries.data.length} entregas
        </p>
        <SegmentedControl
          label="Filtrar entregas"
          options={DELIVERY_FILTERS}
          value={filter.value}
          onValueChange={(value) => filter.onChange(parseDeliveryFilter(value))}
        />
      </div>
      <div className="px-5 empty:hidden sm:px-6">
        <RequestErrorNotice error={retry.error} />
      </div>
      <DeliveryTable
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

function retryingIdOf(isPending: boolean, deliveryId: string | undefined): string | null {
  if (isPending === false || deliveryId === undefined) {
    return null
  }

  return deliveryId
}
